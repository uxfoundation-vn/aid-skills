# Cấu trúc tầng và mode

Nhận dữ liệu từ bước đọc Figma của `ds-token-audit` (kết quả `read.js`: `collections`, `variables` có `resolved`) và `ds-profile.md`. Báo cáo theo format trong `SKILL.md` của `ds-token-audit`.

## Bước 1. Gán tầng
Dùng bảng Collection trong hồ sơ để gán mỗi collection một tầng: Primitive · Theme · Semantic · Component. Riêng nhóm `Component/` trong Theme (M3) là tầng **Theme-Component**. Collection không có trong hồ sơ → ghi Cần hỏi (C1) và bỏ qua khi xét các rule dưới.

Chiều tham chiếu hợp lệ (mũi tên là "trỏ tới"):

| Từ | Được trỏ tới |
|---|---|
| Primitive | Không trỏ đi đâu (chỉ giữ giá trị thô) |
| Theme | Primitive · hoặc giá trị thô nếu hồ sơ chọn "ghi thẳng giá trị" |
| Theme-Component (M3) | Semantic, Theme |
| Semantic | Primitive · Theme · Semantic khác (một token semantic trỏ token semantic khác là được) |
| Component (K2) | Semantic |

## Tiêu chí

| # | Tiêu chí | Kiểm thế nào | Dấu hiệu lệch | Đề xuất | Mức |
|---|---|---|---|---|---|
| C1 | **Tầng khớp hồ sơ** | So danh sách collection và mode với hồ sơ | Thiếu tầng hồ sơ ghi có; thừa collection; tên mode khác hồ sơ | Sửa file hoặc sửa hồ sơ, hỏi người dùng cái nào đúng | Cần hỏi |
| C2 | **Tầng ngoài không giữ giá trị thô** | Biến màu ở Semantic, Component có `values` là mã màu thay vì `→ …` | `bg/bg-card` = `#ffffff` | Thêm giá trị vào Primitive rồi trỏ tới | Phải sửa |
| F2 | **Tham chiếu một chiều, không đứt, không vòng** | Đọc `resolved[mode].chain` và `final` | `final` là `MISSING` (trỏ tới biến đã xoá) · `CYCLE` · `EMPTY` · chain đi ngược bảng trên (Primitive trỏ đi, Semantic trỏ vào Component, Component trỏ thẳng Primitive) | Trỏ lại đúng tầng | Phải sửa |
| F3 | **Mỗi trục ở đúng một tầng** | Tên mode và tên biến | Primitive có hơn 1 mode · Theme có mode Light/Dark · mode ghép hai trục (`Brand1-Dark`) · tên biến ở Primitive/Theme có `light`/`dark` (`primary-dark`) · Light/Dark xuất hiện ở hai collection | Dời trục về đúng tầng theo `../ds-token-build/m1-light-dark.md`, `../ds-token-build/m2-brand.md` | Phải sửa |
| F4 | **Mode đủ giá trị** | `resolved[mode].final` = `EMPTY`; so giá trị các mode | Mode bị trống · **Dark giống hệt Light ở phần lớn biến** (dấu hiệu Figma tự chép giá trị khi thêm mode, chưa ai khai) · một brand giống hệt brand mặc định ở mọi biến | Khai giá trị cho mode đó | Phải sửa (trống) · Cần hỏi (giống hệt) |
| F10 | **Utility không đi qua Theme** | Biến thuộc nhóm utility trong hồ sơ: chain có collection Theme | `utility/illustration/sky` → `Theme:…` | Trỏ thẳng Primitive | Phải sửa |
| C3 | **Theme gọn** | Đếm biến Theme có giá trị **giống nhau ở mọi mode brand** | Biến Theme mà mọi brand cùng một giá trị | Không đổi theo brand thì đưa ra khỏi Theme, Semantic trỏ thẳng Primitive | Nên sửa |

## Cách kết luận
- Biến lấy từ library khác (chain có `[lib]`) thì không audit biến đó, chỉ ghi số lượng ở đầu báo cáo.
- F4 "giống hệt": tính tỉ lệ biến Semantic có giá trị Light = Dark (so `values`, không so `final`). Trên 60% thì báo một dòng chung cho cả collection, liệt kê 5 biến làm ví dụ, đừng báo từng biến. Nhóm utility không đổi Light/Dark theo hồ sơ thì loại khỏi phép đếm.
- Nhiều lỗi F2 cùng một gốc (cả nhóm trỏ vào một biến đã xoá) thì gộp thành một dòng.
- Mỗi dòng báo cáo có bằng chứng: tên biến, mode, chain.

## Ghi chú cho phần khác
Báo cho `binding.md` danh sách biến lỗi F2 (`MISSING`, `CYCLE`): layer đang bind các biến này sẽ hiện sai màu, nên ưu tiên trong 3 việc sửa trước.
