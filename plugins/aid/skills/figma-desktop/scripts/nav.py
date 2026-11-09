#!/usr/bin/env python3
"""Claude Nav cho Figma desktop: server localhost + lệnh cho các session.

Plugin Figma "Lâyơ ở mố?" (thư mục figma-plugin/ của skill) chạy trong từng file Figma, mỗi giây
gửi selection lên server và nhận lại bảng của file đó. Mỗi session Claude push lượt sửa vào
bảng của đúng file, R1–R3 xoay vòng riêng theo (file, session), nên nhiều session cùng làm một
file thì bảng có bấy nhiêu nhóm.

  nav.py push <fileKey> "<tiêu đề>" '<json [[id,label],[null,"nhóm"],…]>' [--who "<tên session>"]
  nav.py open <fileKey> R2        mở tab R2 của session này trên bảng
  nav.py go <fileKey> <nodeId>    nhảy tới node trong file đó
  nav.py sel                      file nào đang mở plugin, đang chọn gì (mới nhất trước)
  nav.py ls [fileKey]             xem bảng đang lưu
  nav.py who "<tên session>"      đặt tên hiện trên bảng cho session này
  nav.py setup [thư mục]          chép plugin Figma ra thư mục đó (mặc định Documents/Claude Nav) để import vào Figma desktop
  nav.py serve | ensure | stop    chạy server (ensure: bật nền nếu chưa chạy)
"""
import json, os, shutil, subprocess, sys, threading, time, urllib.request
import socket
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = 3847
BASE = f'http://127.0.0.1:{PORT}'
# State lives outside the git-synced tools folder: it is per machine and changes every second.
STATE = os.path.expanduser('~/.claude/claude-nav-state.json')
LOG = os.path.expanduser('~/.claude/claude-nav.log')
MAX_TURNS = 3
MAX_SESSIONS = 3            # per file; the least recently pushed session drops off first
SESSION_TTL = 7 * 86400     # sessions with no push for a week drop off
# The skill folder moves on every pack update, so Figma imports a stable copy of the plugin instead.
PLUGIN_SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'figma-plugin')
PLUGIN_DST = os.path.join(os.path.expanduser('~'), 'Documents', 'Claude Nav')
LIVE = 4                    # a plugin that synced within this many seconds counts as open


def sid():
    return os.environ.get('CLAUDE_CODE_HOST_SESSION_ID') or os.environ.get('CLAUDE_CODE_SESSION_ID') or 'manual'


# ---------------- server ----------------

class Store:
    def __init__(self):
        self.lock = threading.Lock()
        try:
            with open(STATE, encoding='utf-8') as f:
                self.s = json.load(f)
        except Exception:
            self.s = {}
        for k in ('files', 'who', 'sel', 'cmds'):
            self.s.setdefault(k, {})
        self.s.setdefault('rev', 0)

    def save(self):
        tmp = STATE + '.tmp'
        os.makedirs(os.path.dirname(STATE), exist_ok=True)
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(self.s, f, ensure_ascii=False)
        os.replace(tmp, STATE)

    def bump(self, key):
        self.s['rev'] += 1
        f = self.s['files'].setdefault(key, {'sessions': {}})
        f['rev'] = self.s['rev']
        return f

    def prune(self, f):
        now = time.time()
        ss = {k: v for k, v in f['sessions'].items() if now - v['at'] < SESSION_TTL and not v.get('hidden')}
        keep = sorted(ss, key=lambda k: ss[k]['at'], reverse=True)[:MAX_SESSIONS]
        f['sessions'] = {k: ss[k] for k in keep}

    def push(self, b):
        with self.lock:
            b['items'] = [i if isinstance(i, list) else [i.get('id'), ' — '.join(x for x in (i.get('label'), i.get('note')) if x)]
                          for i in b.get('items', []) if isinstance(i, (list, dict))]
            f = self.bump(b['file'])
            if b.get('who'):
                self.s['who'][b['sid']] = b['who']
            s = f['sessions'].setdefault(b['sid'], {'seq': 0, 'turns': []})
            s.pop('hidden', None)
            s['seq'] += 1
            code = 'R%d' % ((s['seq'] - 1) % MAX_TURNS + 1)
            s['turns'] = [t for t in s['turns'] if t['code'] != code][-(MAX_TURNS - 1):]
            s['turns'].append({'code': code, 'title': b['title'], 'items': b['items'], 'at': time.time()})
            s['at'] = time.time()
            self.prune(f)
            self.save()
            return {'code': code}

    def cmd(self, b):
        with self.lock:
            c = self.s['cmds'].get(b['file'], {'n': 0})
            self.s['cmds'][b['file']] = {'n': c['n'] + 1, 'at': time.time(), **{k: b[k] for k in ('type', 'sid', 'code', 'id') if k in b}}
            self.save()
            live = time.time() - self.s['sel'].get(b['file'], {}).get('seen', 0) < LIVE
            return {'ok': True, 'live': live}

    def hide(self, b):
        with self.lock:
            f = self.s['files'].get(b['file'])
            if f and b['sid'] in f['sessions']:
                f['sessions'][b['sid']]['hidden'] = True
                self.bump(b['file'])
                self.prune(f)
                self.save()
            return {'ok': True}

    def who(self, b):
        with self.lock:
            self.s['who'][b['sid']] = b['who']
            for k, f in self.s['files'].items():
                if b['sid'] in f['sessions']:
                    self.bump(k)
            self.save()
            return {'ok': True}

    def sync(self, b):
        """Plugin heartbeat: stores its selection, returns the board when it changed and the latest command."""
        key = b['file']
        with self.lock:
            prev = self.s['sel'].get(key, {})
            sel = b.get('sel') or []
            changed = sel != prev.get('sel') or b.get('page') != prev.get('page')
            self.s['sel'][key] = {'name': b.get('name', ''), 'page': b.get('page', ''), 'sel': sel,
                                  'seen': time.time(), 'changed': time.time() if changed or not prev else prev.get('changed', 0)}
            if changed:
                self.save()
            f = self.s['files'].get(key, {'sessions': {}, 'rev': 0})
            out = {'rev': f.get('rev', 0), 'cmd': self.s['cmds'].get(key)}
            if b.get('rev') != out['rev']:
                out['sessions'] = [dict(v, sid=k, who=self.s['who'].get(k, k[-6:])) for k, v in
                                   sorted(f['sessions'].items(), key=lambda kv: kv[1]['at'], reverse=True)]
            return out

    def dump(self, _b):
        with self.lock:
            return self.s


STORE = None


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def head(self, code=200):
        self.send_response(code)
        # The plugin UI is a null-origin iframe inside Figma; allow it, including Chrome's private-network preflight.
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()

    def do_OPTIONS(self):
        self.head(204)

    def do_GET(self):
        self.head()
        self.wfile.write(b'{"ok":true,"app":"claude-nav"}')

    def do_POST(self):
        if self.path == '/stop':
            self.head()
            self.wfile.write(b'{"ok":true}')
            return threading.Thread(target=lambda: [s.shutdown() for s in SERVERS]).start()
        fn = {'/push': STORE.push, '/cmd': STORE.cmd, '/hide': STORE.hide, '/who': STORE.who,
              '/sync': STORE.sync, '/dump': STORE.dump}.get(self.path)
        if not fn:
            return self.head(404)
        try:
            n = int(self.headers.get('Content-Length') or 0)
            out = fn(json.loads(self.rfile.read(n) or b'{}'))
            self.head()
            self.wfile.write(json.dumps(out, ensure_ascii=False).encode())
        except Exception as e:
            self.head(400)
            self.wfile.write(json.dumps({'error': str(e)}).encode())


class H6(ThreadingHTTPServer):
    address_family = socket.AF_INET6


SERVERS = []


def serve():
    global STORE
    STORE = Store()
    SERVERS.append(ThreadingHTTPServer(('127.0.0.1', PORT), H))
    # The plugin calls "localhost", which some machines (often Windows) resolve to ::1 first.
    try:
        SERVERS.append(H6(('::1', PORT), H))
        threading.Thread(target=SERVERS[1].serve_forever, daemon=True).start()
    except OSError:
        pass
    SERVERS[0].serve_forever()


# ---------------- client ----------------

def call(path, body=None, timeout=2):
    req = urllib.request.Request(BASE + path, data=json.dumps(body or {}).encode() if path != '/' else None,
                                 headers={'Content-Type': 'text/plain'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def ensure():
    try:
        return call('/', timeout=0.5)
    except Exception:
        pass
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    # Detach so the server outlives the shell (a Claude hook or Bash call) that started it.
    detach = {'creationflags': 0x00000008 | 0x00000200} if os.name == 'nt' else {'start_new_session': True}
    with open(LOG, 'a', encoding='utf-8') as log:
        subprocess.Popen([sys.executable, os.path.abspath(__file__), 'serve'], stdout=log, stderr=log,
                         stdin=subprocess.DEVNULL, **detach)
    for _ in range(30):
        time.sleep(0.1)
        try:
            return call('/', timeout=0.5)
        except Exception:
            pass
    sys.exit('Không bật được server claude-nav, xem ' + LOG)


def ago(t):
    d = time.time() - t
    return 'vừa xong' if d < 60 else f'{int(d // 60)} phút trước' if d < 3600 else f'{int(d // 3600)} giờ trước' if d < 86400 else f'{int(d // 86400)} ngày trước'


def main(a):
    if not a or a[0] in ('-h', '--help'):
        print(__doc__)
        return
    c = a[0]
    if c == 'serve':
        return serve()
    if c == 'setup':
        dst = os.path.expanduser(a[1]) if len(a) > 1 else PLUGIN_DST
        shutil.copytree(PLUGIN_SRC, dst, dirs_exist_ok=True)
        m = os.path.join(dst, 'manifest.json')
        try:
            if sys.platform == 'darwin':
                subprocess.run(['open', '-R', m])
            elif os.name == 'nt':
                subprocess.run(['explorer', '/select,', m])
        except Exception:
            pass
        print('Plugin Figma nằm ở: ' + m)
        ensure()
        return print('Server claude-nav đang chạy ở ' + BASE)
    if c == 'stop':
        try:
            call('/stop')
            return print('đã tắt')
        except Exception:
            return print('server không chạy')
    ensure()
    if c == 'ensure':
        return print('ok')
    who = None
    if '--who' in a:
        i = a.index('--who')
        who = a[i + 1]
        a = a[:i] + a[i + 2:]
    if c == 'push':
        items = json.loads(a[3])
        r = call('/push', {'file': a[1], 'sid': sid(), 'who': who, 'title': a[2], 'items': items})
        live = time.time() - call('/dump')['sel'].get(a[1], {}).get('seen', 0) < LIVE
        print(r['code'] + ('' if live else '  (plugin chưa mở ở file này — mở plugin Lâyơ ở mố? ở file đó là thấy)'))
    elif c == 'open':
        r = call('/cmd', {'file': a[1], 'type': 'open', 'sid': sid(), 'code': a[2].upper()})
        print('ok' if r['live'] else 'đã gửi, nhưng plugin chưa mở ở file này')
    elif c == 'go':
        r = call('/cmd', {'file': a[1], 'type': 'go', 'id': a[2]})
        print('ok' if r['live'] else 'đã gửi, nhưng plugin chưa mở ở file này')
    elif c == 'who':
        call('/who', {'sid': sid(), 'who': a[1]})
        print('ok')
    elif c == 'sel':
        s = call('/dump')['sel']
        rows = sorted(((k, v) for k, v in s.items() if time.time() - v['seen'] < SESSION_TTL),
                      key=lambda kv: kv[1].get('changed', 0), reverse=True)
        if not rows:
            print('Chưa file nào mở plugin Lâyơ ở mố?.')
        for k, v in rows:
            live = 'đang mở' if time.time() - v['seen'] < LIVE else 'đã đóng ' + ago(v['seen'])
            print(f"{v['name']} · {k} · trang {v.get('page', '')} · {live} · chọn {ago(v.get('changed', 0))}")
            for n in v['sel'] or []:
                print(f"  {n['id']}  {n['type']}  {n['name']}")
            if not v['sel']:
                print('  (không chọn gì)')
    elif c == 'ls':
        st = call('/dump')
        for k, f in st['files'].items():
            if len(a) > 1 and k != a[1]:
                continue
            print(f"{st['sel'].get(k, {}).get('name', k)} · {k}")
            for s_id, s in sorted(f['sessions'].items(), key=lambda kv: kv[1]['at'], reverse=True):
                me = ' (session này)' if s_id == sid() else ''
                print(f"  {st['who'].get(s_id, s_id)}{me} · {ago(s['at'])}")
                for t in s['turns']:
                    print(f"    {t['code']} · {t['title']} · {sum(1 for i in t['items'] if i[0])} layer")
    else:
        sys.exit('Lệnh lạ: ' + c)


if __name__ == '__main__':
    # Windows consoles default to a legacy code page; file and layer names are often Vietnamese.
    for f in (sys.stdout, sys.stderr):
        try:
            f.reconfigure(encoding='utf-8')
        except Exception:
            pass
    main(sys.argv[1:])
