/* ============================================================
   MÂM CƠM — DỮ LIỆU THẺ CÔNG THỨC & HƯỚNG DẪN NẤU
   ============================================================
   Cách thêm / sửa món:
   - Mỗi object trong RECIPES = 1 "recipe card" (1 bữa, có thể gồm nhiều món).
   - Ảnh thẻ: đặt file vào  assets/cards/<id>/front.jpg  và  back.jpg
     (chụp thẻ giấy của bạn, đặt tên đúng như vậy là ảnh tự hiện ra).
   - Sửa chữ, nguyên liệu, các bước chỉ cần đổi ở đây — không đụng HTML.

   Trường các object:
   id     : mã không dấu, dùng cho link & thư mục ảnh
   label  : tên hiển thị của thẻ (có thể gồm nhiều món)
   emoji  : icon đại diện
   servings: khẩu phần
   time   : thời gian nấu ước tính (phút)
   front/back : đường dẫn ảnh mặt trước / sau (theo quy ước thư mục trên)
   intro  : câu giới thiệu bữa (tùy chọn)
   notes  : array mẹo nấu chung (tùy chọn)
   dishes : array các món; mỗi món có { name, emoji, ingredients[], steps[{t,b}] }
   ============================================================ */

const RECIPES = [
  {
    id: 'ga-xao-nam',
    label: 'Gà xào nấm & Canh cải cúc thịt băm',
    emoji: '🍄',
    servings: 2,
    time: 30,
    front: 'assets/cards/ga-xao-nam/front.jpg',
    back:  'assets/cards/ga-xao-nam/back.jpg',
    intro: 'Bữa cơm nhà: một món mặn đậm đà cùng một bát canh thanh mát. Nấu song song hai món để tiết kiệm thời gian.',
    notes: [
      'Ướp gà đủ 15 phút cho mềm và ngấm vị.',
      'Canh cải cúc chỉ nên nấu nhanh để giữ màu xanh.',
    ],
    dishes: [
      {
        name: 'Gà xào nấm',
        emoji: '🍗',
        ingredients: [
          'Đùi gà (hoặc ức) 300g, thái lát mỏng',
          'Nấm hỗn hợp (nấm đùi gà, nấm kim chi) 200g',
          'Ớt chuông 1/2 quả, hành lá, tỏi băm, dầu hào, nước mắm',
        ],
        steps: [
          { t: 'Sơ chế', b: 'Rửa sạch nấm, tách nhỏ, cắt miếng vừa ăn. Gà cắt lát mỏng, rửa qua nước, để ráo.' },
          { t: 'Ướp gà', b: 'Trộn gà với 1 thìa dầu hào, 1 thìa nước mắm, 1/2 thìa đường, tỏi băm, chút tiêu. Ướp khoảng 15 phút.' },
          { t: 'Xào gà', b: 'Chảo nóng dầu ăn, phi tỏi thơm, cho gà vào xào đến khi săn và hơi chín.' },
          { t: 'Xào nấm', b: 'Vớt gà ra, cho nấm cùng ớt chuông vào đảo 2–3 phút cho nấm ra nước.' },
          { t: 'Nêm & hoàn thiện', b: 'Cho gà trở lại, nêm nếm vừa ăn, đảo nhanh 1–2 phút, rắc hành lá, tắt bếp.' },
        ],
      },
      {
        name: 'Canh cải cúc thịt băm',
        emoji: '🥬',
        ingredients: [
          'Cải cúc 300g, nhặt rửa, cắt khúc',
          'Thịt băm 100g, hành tím, nước mắm, dầu ăn',
        ],
        steps: [
          { t: 'Sơ chế', b: 'Cải cúc nhặt, rửa sạch, cắt khúc vừa ăn. Hành tím băm nhỏ.' },
          { t: 'Chần thịt băm', b: 'Trộn thịt băm với 1/2 thìa nước mắm, hành tím, chút tiêu, vo thành viên dẹt.' },
          { t: 'Nấu nước', b: 'Đun 600ml nước cùng 1 thìa hạt nêm cho sôi.' },
          { t: 'Trộn rau', b: 'Cho cải cúc vào, đun khoảng 2 phút cho rau vừa chín tới.' },
          { t: 'Vớt rau & thả thịt băm', b: 'Vớt cải ra, cho thịt băm vào, nêm nếm, rắc hành lá, dùng nóng.' },
        ],
      },
    ],
  },

  {
    id: 'sub-rim-rau-muong',
    label: 'Sườn rim & Rau muống xào tỏi',
    emoji: '🍖',
    servings: 2,
    time: 45,
    front: 'assets/cards/sub-rim-rau-muog/front.jpg',
    back:  'assets/cards/sub-rim-rau-muog/back.jpg',
    intro: 'Món rim đậm vị ăn kèm cơm nóng, kèm rau xào thanh mát cho cân bằng.',
    notes: [
      'Sườn nên rim bằng lửa nhỏ để ngấm và bóng đẹp.',
      'Rau muống xào nhanh, giữ màu xanh và độ giòn.',
    ],
    dishes: [
      {
        name: 'Sườn rim xì dầu',
        emoji: '🍖',
        ingredients: [
          'Sườn heo 300g, chặt miếng, rửa sạch',
          'Đường 1/2 bát con, nước mắm, xì dầu, dấm, hành tím, dầu ăn',
        ],
        steps: [
          { t: 'Chần sườn', b: 'Đun nước sôi, chần sườn 2–3 phút rồi rửa sạch lại để loại bọt và bớt mỡ.' },
          { t: 'Đun đường', b: 'Cho đường vào chảo, đun nhỏ lửa đến khi chuyển màu hổ phách (caramel).' },
          { t: 'Thả sườn', b: 'Cho sườn vào, thêm 1/2 bát nước, nước mắm, xì dầu, dấm và hành tím.' },
          { t: 'Đun nhỏ lửa', b: 'Nấu lửa nhỏ 25–30 phút đến khi cạn, sườn bóng và ngấm.' },
        ],
      },
      {
        name: 'Rau muống xào tỏi',
        emoji: '🥬',
        ingredients: [
          'Rau muống 200g, nhặt rửa, cắt khúc',
          'Tỏi 1/2 củ, nước mắm, dầu ăn',
        ],
        steps: [
          { t: 'Sơ chế', b: 'Rau muống nhặt, rửa sạch, cắt khúc, để ráo. Tỏi băm.' },
          { t: 'Xào rau', b: 'Chảo nóng dầu ăn, phi tỏi thơm, cho rau vào đảo nhanh 1–2 phút.' },
          { t: 'Nêm & hoàn thiện', b: 'Nêm nước mắm, đảo thêm 30 giây, tắt bếp, rắc chút tiêu.' },
        ],
      },
    ],
  },
];
