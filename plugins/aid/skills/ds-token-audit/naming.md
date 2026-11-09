# Tên token

Nhận `variables` từ `read.js` và `ds-profile.md`. Báo cáo theo format trong `SKILL.md` của `ds-token-audit`.

Tên token là thứ agent đọc để chọn token. Tên nói đúng vai trò thì agent chọn đúng mà không cần đọc giá trị hay description.

## Tiêu chí

| # | Tiêu chí | Áp cho | Dấu hiệu lệch | Đề xuất | Mức |
|---|---|---|---|---|---|
| F6 | **Tên theo vai trò, không theo giá trị** | Semantic, Component | Tên chứa tên màu (`blue`, `red`, `gray`, `grey`, `xanh`, `đỏ`…), mã bậc (`-500`, `-9`), mã hex, con số giá trị (`radius-8`, `spacing-16px`) | Đặt theo vai trò: `bg-blue` → `bg-info` hoặc `bg-primary` tuỳ chỗ dùng | Phải sửa |
| F7 | **Một cách đặt tên** | Cả bộ | Lẫn dấu phân cách (`/` với `.`) · lẫn kiểu chữ (`bgPrimary`, `bg_primary`, `bg-primary`) · lẫn thang trong cùng tầng Primitive (`blue-500` và `teal-9`) | Đưa về kiểu trong hồ sơ | Phải sửa (lẫn thang) · Nên sửa (lẫn kiểu chữ) |
| N1 | **Primitive đặt theo họ × bậc** | Primitive | Tên theo vai trò ở Primitive (`primary`, `background`) · thiếu bậc | Primitive chỉ có `<họ>/<họ>-<bậc>`; vai trò để Semantic | Nên sửa |
| N2 | **Tiền tố vai trò khớp hồ sơ** | Semantic | Tiền tố cấp 1 không nằm trong bộ vai trò của hồ sơ (`fill/`, `surface/` khi hồ sơ ghi `bg`) | Đổi về tiền tố trong hồ sơ, hoặc thêm vai trò mới vào hồ sơ nếu có lý do | Cần hỏi |
| N3 | **Đúng khuôn tên trong hồ sơ** | Semantic, Component | Hồ sơ lặp tiền tố (`bg/bg-primary`) mà có biến không lặp (`bg/primary`), hoặc ngược lại · Component token không mở đầu bằng tên component trong code | Đổi theo khuôn | Nên sửa |

## Ngoại lệ của F6
Không báo F6 với:
- `utility/tag/<màu>`, `utility/chart/<số>`, `utility/social/<hãng>`: tên màu, số thứ tự, tên hãng chính là vai trò.
- Màu trạng thái theo nghĩa: `error`, `success`, `warning`, `info`.
- Nhóm số mà hồ sơ chọn đặt theo thang: `spacing/spacing-4` (bậc 4 của thang), `radius/radius-md`. Chỉ báo khi tên là **giá trị px** (`spacing-16px`, `radius-8` khi thang dùng `sm/md/lg`).
- Primitive: tên theo màu và bậc là đúng.

## Đề xuất tên mới
- Tên theo màu → xem biến đó đang được bind ở đâu (`layers` của `read.js`, đếm theo `comp` và thuộc tính) rồi đề xuất vai trò. Không đoán được thì Cần hỏi, nêu những chỗ đang dùng.
- Đổi tên trong Figma giữ nguyên liên kết của layer đã bind, nên đổi tên an toàn. Nhắc: nếu code bên dev đã dùng tên cũ thì báo dev cùng đổi.

## Cách kết luận
- Lỗi lặp lại theo một khuôn (cả nhóm `color.bg.*` dùng dấu chấm) thì gộp một dòng, ghi số biến và 3 ví dụ.
- Không báo F7 cho biến lấy từ library khác.
