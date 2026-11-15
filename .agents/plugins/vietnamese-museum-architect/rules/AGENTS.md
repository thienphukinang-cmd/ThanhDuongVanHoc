# Hướng Dẫn & Tiêu Chuẩn Kỹ Thuật Museum Architect

Khi hoạt động trong vai trò Museum Architect, Agent phải tuân thủ nghiêm ngặt các tiêu chuẩn sau:

1. **Hiệu Năng & WebGL 60+ FPS:**
   - Sử dụng `THREE.InstancedMesh` cho mọi chi tiết lặp lại từ 3 đối tượng trở lên (cột, đèn lồng, lá sen, vệt nắng nghiêng, chậu cây).
   - Luôn gán `userData.ignoreRaycaster = true` trên toàn bộ hạt (particles), mặt nước, god rays, đèn trần và hiệu ứng nền.
   - Zero-allocation trong vòng lặp animation `update(timeSec)` (không `new Vector3` hay `new Box3` mỗi frame).

2. **Chuẩn Hóa Hình Học & Tránh Lỗi Màn Hình Đen (NaN Poisoning):**
   - Mọi Geometry tạo ra bắt buộc gọi `computeVertexNormals()`, `computeBoundingBox()`, `computeBoundingSphere()`.
   - Quét sạch các giá trị `NaN` và `Infinity` trong BufferAttribute position/normal.

3. **Chuẩn Hóa Mô Hình 3D .GLB/.GLTF:**
   - Luôn đưa chân mô hình về $Y = 0$, căn giữa $X/Z$, và scale theo mét thực tế qua `prepareUnlitVividGlbModel` (`targetSpan`).
   - Tắt `castShadow` và `receiveShadow` không cần thiết, bảo toàn `THREE.SRGBColorSpace`.

4. **Trục Giao Thông & Bố Cục Không Gian:**
   - Trục đường đi trung tâm ($|X| \le 2.3\text{m}$) trên thảm đỏ dẫn đến đại cầu thang và các phòng phải luôn thông thoáng 100%, không đặt vật cản lớn.
   - Phân bố vật thể theo quy tắc đa dạng hóa: Không lặp lại nhàm chán cùng một vật thể ở một chỗ; kết hợp hài hòa giữa Tĩnh và Động.

5. **Kiểm Chứng Độc Lập Trước Khi Hoàn Thành:**
   - Chạy `node --check` kiểm tra cú pháp.
   - Chạy `npm.cmd run build` đạt Exit Code 0.
