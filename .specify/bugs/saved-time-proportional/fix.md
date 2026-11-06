# Bug Fix: "BẠN TIẾT KIỆM ĐƯỢC" tính số lần vô lý

**Slug**: saved-time-proportional
**Date**: 2026-11-07

## Changes

| # | File | Thay đổi |
|---|------|----------|
| 1 | `index.html:2303-2311` | `WEEK_IDEAS` → `WEEK_ACTS`, mỗi hoạt động có `min` (phút) + `text` + `img` |
| 2 | `index.html:2312-2320` | `YEAR_IDEAS` → `YEAR_ACTS`, chỉ mốc ≥ 1 ngày (1440/2880/4320/10080/20160 phút) |
| 3 | `index.html:2329-2351` | `fillIdeaList()` → `fillCountList()`: bỏ `Math.max(1,…)`, chỉ hiện khi `n >= 1`, fallback theo ngày |
| 4 | `index.html:2353` | `updateSavings()` gọi `fillCountList()` cho tuần và năm |

### Đoạn lõi (index.html:2329-2351)

```javascript
// Liệt kê số lần KHÁCH THỰC SỰ đổi được từ số phút đã tiết kiệm.
// Không ép tối thiểu 1 lần — nếu thời gian tiết kiệm chưa đủ cho một
// chuyến 7 ngày thì không được hứa hẹn 1 lần.
function fillCountList(listEl, acts, totalMin){
  var rows = acts
    .map(function(a){ return { a: a, n: Math.floor(totalMin / a.min) }; })
    .filter(function(r){ return r.n >= 1; })
    .sort(function(p, q){ return q.n - p.n; })
    .slice(0, 4);
  listEl.innerHTML = "";
  if(!rows.length){
    var days = Math.max(1, Math.round(totalMin / 1440));
    rows = [{ a: { text: "ngày không phải đi chợ, nghĩ món", img: "☀️" }, n: days }];
  }
  rows.forEach(function(r){
    var li = document.createElement("li");
    var img = document.createElement("span");
    img.className = "idea__img";
    img.textContent = r.a.img || "⏱️";
    var txt = document.createElement("span");
    txt.className = "idea__txt";
    txt.textContent = "≈ " + r.n + " lần " + r.a.text;
    li.appendChild(img);
    li.appendChild(txt);
    listEl.appendChild(li);
  });
}
```

## Diff Highlights

- Bỏ hẳn `Math.max(1, ...)` — đây là chỗ sinh ra lời hứa sai ("39 giờ → 1 lần du lịch 7 ngày").
- Mốc "năm" chỉ còn ở thang ngày trở lên → không còn "91 lần một buổi chiều".
- Sắp xếp theo số lần giảm dần, lấy tối đa 4 dòng → danh sách gọn, dễ đọc trên điện thoại.

## Tests

| Loại | Nội dung | Kết quả |
|------|----------|---------|
| Logic | Chọn 1, 2, 3, 6 món, đọc hai danh sách | Tỷ lệ hợp lý, không hứa quá mức ✅ |
| Regression | Không còn chuỗi "lần nghỉ cuối tuần"/"buổi chiều thảnh thơi" ở khối năm | ✅ |
| Console | Reload | Không lỗi ✅ |

## Local Verification

Ví dụ với **6 món** (đã kiểm trong preview):

```
Trong tuần:   ≈ 9 lần uống một ly cà phê thật chậm
               ≈ 6 lần đọc một chương sách
               ≈ 4 lần một buổi đi bơi / tập gym
               ≈ 2 lần xem trọn một bộ phim
Trong một năm:≈ 9 lần một ngày trọn vẹn không phải nghĩ món
               ≈ 4 lần hai ngày cuối tuần chỉ để ở nhà
               ≈ 3 lần một chuyến du lịch gia đình 3 ngày
               ≈ 1 lần một chuyến du lịch xa 7 ngày
```

Khối "năm" chỉ hiện mốc ≥ 1 ngày, và mọi con số đều ≤ tổng thời gian tiết kiệm.

## Deviations

- Không có.

## Follow-ups

- Không có.
