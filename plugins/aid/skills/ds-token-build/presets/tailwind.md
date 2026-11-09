# Bảng màu Tailwind CSS 4

Nguồn: gói npm `tailwindcss@4.1.11`, file `theme.css` (license MIT). Bản gốc viết bằng OKLCH; ở đây đã quy về hex sRGB vì Figma Variables lưu màu sRGB.
75 ô có màu gốc nằm ngoài gam sRGB, đã giảm độ đậm cho vừa (giữ độ sáng và sắc độ), nên hơi nhạt hơn bản gốc một chút trên màn hình rộng gam.

Skill `ds-token-build` (phần `primitive.md`) đọc file này qua `scale.py preset tailwind`. Người đọc dùng để tra mã. **Không sửa tay**: muốn đổi thì sinh lại từ nguồn.

Thang 11 bậc 50–950. Bậc hay dùng: 50–100 nền nhạt · 200–300 viền · 500–600 nền đặc, chữ brand · 700–950 chữ, nền tối.

## Màu nền tảng

| Họ | white | black |
|---|---|---|
| base | #ffffff | #000000 |

## Thang màu

| Họ | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| red | #fef2f2 | #ffe2e2 | #ffcaca | #ffa3a4 | #ff6568 | #fb2c36 | #e40016 | #bf000f | #9f0712 | #82181a | #460809 |
| orange | #fff7ed | #ffedd5 | #ffd7a8 | #ffb970 | #ff8b1f | #fc7100 | #ec5600 | #c43e00 | #9f2d00 | #7e2a0c | #441306 |
| amber | #fffbeb | #fef3c6 | #fee685 | #ffd237 | #fabc00 | #f69e00 | #da7700 | #b55200 | #953d00 | #7b3306 | #461901 |
| yellow | #fefce8 | #fef9c2 | #fff085 | #ffe030 | #f7c900 | #eab300 | #ca8a00 | #a26200 | #874c00 | #733e0a | #432004 |
| lime | #f7fee7 | #ecfcca | #d8f999 | #bbf451 | #9de500 | #83cc00 | #64a300 | #4b7c00 | #3d6300 | #35530e | #192e03 |
| green | #f0fdf4 | #dcfce7 | #b9f8cf | #7bf1a8 | #05df72 | #00c65a | #00a447 | #00813a | #016630 | #0d542b | #032e15 |
| emerald | #ecfdf5 | #d0fae5 | #a4f4cf | #5ee9b5 | #00d294 | #00b981 | #009669 | #007857 | #005f46 | #004e3b | #002c22 |
| teal | #f0fdfa | #cbfbf1 | #96f7e4 | #46ecd5 | #00d3bd | #00b9a6 | #009488 | #00776e | #005f5a | #0b4f4a | #022f2e |
| cyan | #ecfeff | #cefafe | #a2f4fd | #53eafd | #00d1ec | #00b6d4 | #0091b3 | #007491 | #005f78 | #104e64 | #053345 |
| sky | #f0f9ff | #dff2fe | #b8e6fe | #78d4ff | #00bbfd | #00a5ea | #0084c7 | #0069a2 | #005986 | #024a70 | #052f4a |
| blue | #eff6ff | #dbeafe | #bedbff | #91c5ff | #56a2ff | #3280ff | #155dfc | #1447e6 | #193cb8 | #1c398e | #162456 |
| indigo | #eef2ff | #e0e7ff | #c7d2ff | #a4b4ff | #7d87ff | #6260ff | #4f39f6 | #432dd7 | #372aac | #312c85 | #1e1a4d |
| violet | #f5f3ff | #ede9fe | #ddd6ff | #c4b4ff | #a686ff | #8d56ff | #7f22fe | #7008e7 | #5d0ec0 | #4d179a | #2f0d68 |
| purple | #faf5ff | #f3e8ff | #e9d5ff | #d8b4ff | #bf7eff | #ab4eff | #9810fa | #8200d9 | #6e11b0 | #59168b | #3c0366 |
| fuchsia | #fdf4ff | #fae8ff | #f6cfff | #f2a9ff | #ec6dff | #e12afb | #c500da | #a600b4 | #8a0194 | #721378 | #4b004f |
| pink | #fdf2f8 | #fce7f3 | #fccee8 | #fda5d5 | #fb64b6 | #f6339a | #e30076 | #c2005c | #a2004c | #861043 | #510424 |
| rose | #fff1f2 | #ffe4e6 | #ffccd3 | #ffa3ae | #ff6880 | #ff2357 | #e60045 | #c1003a | #a30037 | #8b0836 | #4d0218 |
| slate | #f8fafc | #f1f5f9 | #e2e8f0 | #cad5e2 | #90a1b9 | #62748e | #45556c | #314158 | #1d293d | #0f172b | #020618 |
| gray | #f9fafb | #f3f4f6 | #e5e7eb | #d1d5dc | #99a1af | #6a7282 | #4a5565 | #364153 | #1e2939 | #101828 | #030712 |
| zinc | #fafafa | #f4f4f5 | #e4e4e7 | #d4d4d8 | #9f9fa9 | #71717b | #52525c | #3f3f46 | #27272a | #18181b | #09090b |
| neutral | #fafafa | #f5f5f5 | #e5e5e5 | #d4d4d4 | #a1a1a1 | #737373 | #525252 | #404040 | #262626 | #171717 | #0a0a0a |
| stone | #fafaf9 | #f5f5f4 | #e7e5e4 | #d6d3d1 | #a6a09b | #79716b | #57534d | #44403b | #292524 | #1c1917 | #0c0a09 |
