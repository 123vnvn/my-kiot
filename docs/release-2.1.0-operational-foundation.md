# Release 2.1.0 — vận hành nền tảng bảo mật (2026-10-09)

## Phạm vi đã hoàn thành
- Phiên trình duyệt dùng cookie HttpOnly, SameSite=Strict; thêm Secure khi yêu cầu đến bằng HTTPS (trực tiếp hoặc TRUST_PROXY=1 + X-Forwarded-Proto=https). HTTP loopback demo cố ý không đặt Secure để localhost hoạt động.
- CSRF token trong bộ nhớ trang và kiểm tra Origin cho thao tác thay đổi dữ liệu. Không còn lưu bearer trong localStorage. Bearer cũ chỉ được cấp khi client gửi x-legacy-bearer: 1 để hỗ trợ giai đoạn chuyển đổi; cần loại bỏ sau khi các client cũ được thống kê.
- Giới hạn đăng nhập còn 5 lần sai / 15 phút / IP+email; logout và vô hiệu hóa tài khoản thu hồi phiên.
- JavaScript chuyển sang public/app.js; CSP script-src chỉ còn 'self', không unsafe-inline.
- Hoàn hàng chuyển từ prompt sang dialog có nhãn, giới hạn số lượng còn hoàn, xác nhận bắt buộc, trạng thái đang xử lý và lỗi tại chỗ; gọi API hoàn tiền thật của ứng dụng demo.
- Giữ nguyên bản sửa CSS [hidden]{display:none!important}.

## Bằng chứng
- Trước thay đổi: backups/source-pre-security-20261009-072314.zip và backups/database-pre-security-20261009-072314.db.
- Backup SQLite được tạo bằng VACUUM INTO, integrity_check=ok; restore-verify trên bản sao thư mục tạm: isolated=true, integrity=ok, migrations=1.
- npm test: 27/27 đạt trên DB tạm cô lập (sau khi thêm test startup gate).
- Kiểm tra tĩnh/DOM có thực hiện; không gọi đó là E2E. Không có kiểm thử trình duyệt thật do chính sách localhost trước đó đã từ chối.

## Cổng khởi động
- Mặc định APP_MODE=demo, dùng dữ liệu mẫu hiện có.
- APP_MODE=real bị chặn nếu thiếu bất kỳ điều kiện nào: REAL_DATA_APPROVED=YES, DB_FILE chỉ định rõ, TRUST_PROXY=1. Các biến này chưa được bật và không có dữ liệu thật nào được nạp.
- Dù đủ cổng kỹ thuật, vẫn cần phê duyệt con người, TLS/reverse proxy đã kiểm chứng, bí mật vận hành, backup/restore rehearsal và acceptance trước khi dùng thật.

## PostgreSQL — đánh giá, chưa triển khai
SQLite phù hợp demo/1 tiến trình hiện tại. PostgreSQL nên là bước sau khi chốt concurrency, HA, RPO/RTO và môi trường staging. Cần adapter DB, chuyển placeholder/transaction, migration có checksum, dual reconciliation hoặc cutover có downtime, backup/restore PostgreSQL và load/concurrency tests. Không tuyên bố đã migrate hay test PostgreSQL.

## Chặn phát hành chính thức
- Chưa có browser E2E login → POS → refund → reports.
- Chưa có TLS/reverse proxy staging và kiểm chứng Secure cookie/Origin sau proxy.
- CSRF secret đang sinh lại khi tiến trình khởi động: phiên cookie cũ vẫn đọc được nhưng token CSRF phải lấy lại qua /api/me; cần cân nhắc secret chia sẻ nếu chạy đa tiến trình.
- Rate limit nằm trong RAM, không chia sẻ đa tiến trình và mất khi restart.
- Chưa có quy trình secret management, observability/alert, retention, DR rehearsal theo RPO/RTO, load test, pen-test, UAT/ký duyệt nghiệp vụ và PostgreSQL.
- Legacy bearer vẫn còn đường tương thích có chủ đích.

## Bước kế tiếp đề nghị
Staging HTTPS riêng, chạy browser E2E thực sự và rehearsal backup/restore + đối soát đơn/tồn kho/sổ tài chính; sau đó mới quyết định loại bỏ bearer cũ và thiết kế PostgreSQL.
