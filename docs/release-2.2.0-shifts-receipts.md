# Release 2.2.0 — ca thu ngân và hóa đơn in (2026-10-09)

## Hoàn thành trong increment này
- Migration v3: cashier_shifts, cash_movements append-only và payments.shift_id.
- Mở ca có tiền đầu ca; một ca mở cho mỗi tài khoản; idempotency và store isolation.
- Thu vào/chi ra có lý do, idempotency, chỉ trên ca đang mở của chính người dùng.
- Giao dịch tiền mặt bắt buộc ca mở; chuyển khoản/thẻ không gán vào két. Nếu thiếu ca, toàn bộ đơn/tồn kho được rollback.
- Hoàn tiền mặt bắt buộc ca của người hoàn và được ghi âm vào đối soát ca.
- Đóng ca chụp expected_cash = opening + payments đã ký + pay-in − payout; lưu counted_cash và difference.
- API và giao diện xem lại hóa đơn từ dữ liệu đơn đã lưu, khổ CSS 58/80 mm, in qua trình duyệt. Không tích hợp hoặc tuyên bố đã kiểm thử máy in thật.

## Backup trước thay đổi
- backups/source-pre-shifts-20261009-122717.zip
- backups/database-pre-shifts-20261009-122717.db
- Backup SQLite: integrity=ok; restore trên bản sao cô lập: integrity=ok.

## Kiểm thử
- npm test: 33/33 đạt, dùng SQLite tạm cô lập.
- Bao phủ: yêu cầu mở ca cho cash; rollback; open/movement/close idempotency; store isolation; sale/refund gắn shift; đối soát opening + movements + sales − refunds; receipt stored facts; non-cash không cần ca; migration/UI regressions; cookie/CSRF/CSP cũ.
- Preview API/static smoke: index 200, /app.js 200 text/javascript, strict script CSP, hidden fix, invalid password 401, HttpOnly cookie login, bootstrap 200, CSRF logout 200, post-logout 401.
- Đây là API/static smoke và DOM regression, không phải browser E2E.

## Preview an toàn
- URL: http://127.0.0.1:4174
- Process được khởi động từ cwd dự án trong session faint-falcon.
- DB riêng: backups/preview-2.2.db, sao từ consistent backup trước khi migration v3; không ghi đồng thời vào data/sales.db.
- Listener cũ 4173 không bị dừng hoặc thay đổi do không xác minh chắc chắn ownership cwd.

## Chưa production-ready
Browser E2E, HTTPS proxy/Secure cookie verification, printer acceptance, drawer ownership model cho nhiều quầy dùng chung, supervisor override/forced close, shift timezone/business-day rules, centralized rate limit/session store, PostgreSQL, monitoring, secrets, load/security testing, DR rehearsal và UAT vẫn chưa hoàn tất.
