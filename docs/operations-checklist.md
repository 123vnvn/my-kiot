# Checklist demo → vận hành thật

## Hiện tại (demo)
- [x] Dữ liệu mẫu và banner DEMO được giữ nguyên.
- [x] Backup source/config và SQLite nhất quán; restore cô lập đã kiểm tra.
- [x] Unit/API/static-DOM tests dùng DB tạm.
- [ ] Browser E2E thật.

## Trước staging HTTPS
- [ ] Phê duyệt host, reverse proxy/TLS và cấu hình TRUST_PROXY chính xác.
- [ ] Dùng DB staging riêng; không sao chép dữ liệu thật khi chưa phê duyệt.
- [ ] Xác nhận Set-Cookie có Secure/HttpOnly/SameSite và Origin hợp lệ qua proxy.
- [ ] Chạy login → POS → hoàn hàng → báo cáo bằng browser và đối soát DB.
- [ ] Test backup, restore, RPO/RTO và rollback release.

## Trước dữ liệu thật
- [ ] Phê duyệt bằng văn bản; đặt APP_MODE=real, REAL_DATA_APPROVED=YES, DB_FILE rõ ràng, TRUST_PROXY=1 chỉ trong cấu hình được quản lý.
- [ ] Secret management, log/metrics/alert, phân quyền/UAT, load/concurrency và security review.
- [ ] Quyết định/kiểm thử PostgreSQL; hiện chưa migrate, chưa test.
- [ ] Loại bỏ legacy bearer sau inventory client và kế hoạch chuyển đổi.
