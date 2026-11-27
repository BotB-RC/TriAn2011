// home.js – Trang chủ (Cặp 1)
// Bố cục theo ảnh thiết kế mẫu + đồng bộ chuyển động GSAP với send.js
// Giữ tính năng 30 câu danh ngôn / ca dao về thầy cô chạy hiệu ứng mượt từ trái sang phải bên dưới tiêu đề

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (min, max) => Math.random() * (max - min) + min;

// Danh sách 30 câu danh ngôn của các danh nhân nổi tiếng & ca dao/tục ngữ truyền thống (15s chuyển 1 lần)
const TEACHER_PROVERBS = [
  {
    quote: '“Vì lợi ích mười năm thì phải trồng cây, vì lợi ích trăm năm thì phải trồng người.”',
    author: '— Hồ Chí Minh —'
  },
  {
    quote: '“Nghề dạy học là nghề cao quý nhất trong những nghề cao quý, nghề sáng tạo nhất trong những nghề sáng tạo.”',
    author: '— Phạm Văn Đồng —'
  },
  {
    quote: '“Dưới ánh mặt trời không có nghề nào cao quý hơn nghề dạy học.”',
    author: '— Comenius —'
  },
  {
    quote: '“Một người thầy giỏi giống như ngọn nến — cháy hết mình để thắp sáng đường đi cho những người khác.”',
    author: '— Mustafa Kemal Atatürk —'
  },
  {
    quote: '“Người thầy trung bình chỉ biết nói, người thầy giỏi biết giải thích, người thầy xuất chúng biết minh họa, người thầy vĩ đại biết truyền cảm hứng.”',
    author: '— William Arthur Ward —'
  },
  {
    quote: '“Nghệ thuật tối thượng của người thầy là đánh thức niềm vui trong sự sáng tạo và tri thức.”',
    author: '— Albert Einstein —'
  },
  {
    quote: '“Tôi mang ơn cha mẹ cho tôi sự sống, nhưng mang ơn thầy tôi vì đã dạy tôi sống cho đẹp.”',
    author: '— Alexander Đại Đế —'
  },
  {
    quote: '“Giáo dục là vũ khí mạnh nhất mà người ta có thể sử dụng để thay đổi thế giới.”',
    author: '— Nelson Mandela —'
  },
  {
    quote: '“Một đứa trẻ, một người thầy, một quyển sách và một cây bút có thể thay đổi cả thế giới.”',
    author: '— Malala Yousafzai —'
  },
  {
    quote: '“Người thầy chạm đến sự vĩnh cửu; không ai có thể biết được ảnh hưởng của người thầy sẽ dừng lại ở đâu.”',
    author: '— Henry Brooks Adams —'
  },
  {
    quote: '“Những gì người thầy là, quan trọng hơn những gì người thầy dạy.”',
    author: '— Karl Menninger —'
  },
  {
    quote: '“Nếu một kỹ sư vui mừng nhìn thấy cây cầu mình vừa mới xây xong, người nông dân mỉm cười nhìn đồng lúa mình vừa mới trồng, thì người giáo viên vui sướng khi nhìn thấy học sinh đang trưởng thành, lớn lên.”',
    author: '— Gô-lô-bô-lin —'
  },
  {
    quote: '“Phải tôn kính thầy dạy mình, bởi lẽ nếu cha mẹ cho ta sự sống thì chính các thầy giáo cho ta phương cách sống đàng hoàng tử tế.”',
    author: '— Philoxène de Cythère —'
  },
  {
    quote: '“Để cho con một hòm vàng không bằng dạy cho con một quyển sách hay.”',
    author: '— Vi Hiền Truyện —'
  },
  {
    quote: '“Nhân cách của người thầy là sức mạnh có ảnh hưởng to lớn đối với học sinh, sức mạnh đó không thể thay thế bằng bất kỳ cuốn sách giáo khoa nào.”',
    author: '— Konstantin Ushinsky —'
  },
  {
    quote: '“Bậc thầy về nghệ thuật sống không phân biệt rạch ròi giữa công việc và niềm vui, giữa dạy học và truyền lửa.”',
    author: '— L. P. Jacks —'
  },
  {
    quote: '“Giáo dục không phải là việc đổ đầy một chiếc bình, mà là thắp lên một ngọn lửa.”',
    author: '— William Butler Yeats —'
  },
  {
    quote: '“Thầy giáo là đường tinh lọc, là thỏi vàng nguyên chất trong cuộc đời học trò.”',
    author: '— Nguyễn Bá Học —'
  },
  {
    quote: '“Tiên học lễ, hậu học văn.”',
    author: '— Chu Văn An —'
  },
  {
    quote: '“Hiền tài là nguyên khí của quốc gia.”',
    author: '— Thân Nhân Trung —'
  },
  {
    quote: '“Ngọc không mài không thành đồ vật, người không học không biết rõ đạo.”',
    author: '— La Sơn Phu Tử Nguyễn Thiếp —'
  },
  {
    quote: '“Có một nghề bụi phấn bám đầy tay, người ta bảo đó là nghề trong sạch nhất. Có một nghề không trồng cây vào đất, mà mang lại cho Đời đầy trái ngọt hoa tươi.”',
    author: '— Đinh Văn Nhã —'
  },
  {
    quote: '“Khi thầy viết bảng, bụi phấn rơi rơi, có hạt bụi nào rơi trên bục giảng, có hạt bụi nào vương trên tóc thầy…”',
    author: '— Vũ Hoàng —'
  },
  {
    quote: '“Muốn sang thì bắc cầu kiều, muốn con hay chữ thì yêu lấy thầy.”',
    author: '— Ca dao —'
  },
  {
    quote: '“Cơm cha, áo mẹ, chữ thầy — Gắng công mà học có ngày thành danh.”',
    author: '— Ca dao —'
  },
  {
    quote: '“Mười năm rèn luyện sách đèn, công danh gặp bước chớ quên ơn thầy.”',
    author: '— Ca dao —'
  },
  {
    quote: '“Gươm vàng rớt xuống Hồ Tây, ơn cha nghĩa trọng công thầy cũng sâu.”',
    author: '— Ca dao —'
  },
  {
    quote: '“Ăn quả nhớ kẻ trồng cây, có danh có vọng nhớ thầy khi xưa.”',
    author: '— Ca dao —'
  },
  {
    quote: '“Nhất tự vi sư, bán tự vi sư.”',
    author: '— Tục ngữ —'
  },
  {
    quote: '“Không thầy đố mày làm nên.”',
    author: '— Tục ngữ —'
  }
];

let currentQuoteIdx = Math.floor(Math.random() * TEACHER_PROVERBS.length);

// ===== 1. Hiệu ứng bụi nắng ấm áp trôi từ trên xuống hết màn hình rồi lặp lại =====
function createSunlightDust() {
  const layer = document.querySelector('.dust-layer');
  if (!layer || typeof window.gsap === 'undefined') return;

  const gsap = window.gsap;
  const isMobile = window.innerWidth < 640;
  const count = isMobile ? 24 : 48;
  const colors = [
    'rgba(255, 255, 255, 0.92)',
    'rgba(253, 230, 138, 0.88)', // --amber-soft (#FDE68A)
    'rgba(245, 158, 11, 0.72)'   // --amber (#F59E0B)
  ];

  for (let i = 0; i < count; i++) {
    const size = rand(3.5, 11);
    const color = colors[Math.floor(Math.random() * colors.length)];
    const dot = document.createElement('span');
    dot.className = 'dust';
    dot.style.width = dot.style.height = `${size}px`;
    dot.style.background = `radial-gradient(circle, ${color} 0%, transparent 72%)`;
    dot.style.filter = `blur(${rand(0.4, 2)}px)`;
    layer.appendChild(dot);

    const w = window.innerWidth;
    const h = window.innerHeight;
    const startX = rand(0, w);
    const startY = rand(-h * 0.2, h);

    gsap.set(dot, { x: startX, y: startY, opacity: rand(0.25, 0.75) });

    // Rơi nhẹ nhàng xuống hết đáy màn hình rồi lặp lại từ đỉnh
    const fallDuration = rand(12, 24);
    gsap.fromTo(
      dot,
      { y: -20, x: startX },
      {
        y: h + 30,
        x: startX + rand(-70, 70),
        duration: fallDuration,
        ease: 'none',
        repeat: -1,
        delay: -rand(0, fallDuration)
      }
    );

    gsap.to(dot, {
      opacity: rand(0.2, 0.8),
      duration: rand(2.5, 5),
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    });
  }
}

// ===== 2. Hiệu ứng danh ngôn / ca dao & nguồn: Chữ mất dần từ trái sang phải rồi hiện câu mới từ trái sang phải =====
function setupProverbRotator() {
  const quoteEl = document.getElementById('chalk-quote');
  const authorEl = document.getElementById('chalk-author');
  if (!quoteEl || !authorEl) return;

  // Tách chữ thành từng ký tự (gom theo từ để không bị gãy dòng giữa từ)
  const fillWithChars = (el, text) => {
    el.textContent = '';
    const words = text.split(' ');
    words.forEach((word, wi) => {
      const w = document.createElement('span');
      w.className = 'q-word';
      [...word].forEach((ch) => {
        const c = document.createElement('span');
        c.className = 'q-char';
        c.textContent = ch;
        w.appendChild(c);
      });
      el.appendChild(w);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  };

  const renderQuote = (idx) => {
    const item = TEACHER_PROVERBS[idx];
    fillWithChars(quoteEl, item.quote);
    fillWithChars(authorEl, item.author);
    return [...quoteEl.querySelectorAll('.q-char'), ...authorEl.querySelectorAll('.q-char')];
  };

  renderQuote(currentQuoteIdx);

  let isTransitioning = false;

  const cycleQuote = () => {
    if (isTransitioning) return;
    const nextIdx = (currentQuoteIdx + 1) % TEACHER_PROVERBS.length;

    if (typeof window.gsap === 'undefined') {
      currentQuoteIdx = nextIdx;
      renderQuote(currentQuoteIdx);
      return;
    }

    isTransitioning = true;
    const gsap = window.gsap;
    const oldChars = [...quoteEl.querySelectorAll('.q-char'), ...authorEl.querySelectorAll('.q-char')];

    // 1) Các ký tự câu cũ mất dần êm ái từ trái sang phải
    gsap.to(oldChars, {
      opacity: 0,
      x: 4,
      filter: 'blur(3px)',
      duration: 0.65,
      ease: 'power2.inOut',
      stagger: {
        each: 0.015,
        from: 'start'
      },
      onComplete: () => {
        // 2) Câu mới hiện dần từ trái sang phải thật mượt mà
        currentQuoteIdx = nextIdx;
        const newChars = renderQuote(currentQuoteIdx);

        gsap.set(newChars, {
          opacity: 0,
          x: -5,
          filter: 'blur(3px)'
        });

        gsap.to(newChars, {
          opacity: 1,
          x: 0,
          filter: 'blur(0px)',
          duration: 0.85,
          ease: 'power2.out',
          stagger: {
            each: 0.017,
            from: 'start'
          },
          onComplete: () => {
            isTransitioning = false;
          }
        });
      }
    });
  };

  // Tự động đổi câu mỗi 15 giây
  setInterval(cycleQuote, 15000);
}

// ===== 3. Chuyển động nền & Intro đồng bộ với send.js =====
function playIntroAndBlobs() {
  if (typeof window.gsap === 'undefined' || prefersReducedMotion) return;
  const gsap = window.gsap;

  // Các quầng sáng .blob trôi nhẹ giống hệt floatBlobs() trong send.js
  document.querySelectorAll('.blob').forEach((b) => {
    gsap.to(b, {
      x: gsap.utils.random(-40, 40),
      y: gsap.utils.random(-30, 30),
      duration: gsap.utils.random(6, 10),
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    });
  });

  // Cánh hoa ánh sáng nghiêng nhẹ
  gsap.to('.hero__floral', {
    rotation: 2.5,
    scale: 1.03,
    duration: 9,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  });

  // Hiệu ứng xuất hiện khi mở trang
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from('.top-action', { y: -18, opacity: 0, duration: 0.65, stagger: 0.12 })
    .from('.title__line', { y: 36, opacity: 0, duration: 0.85, stagger: 0.18 }, '-=0.3')
    .from('.proverb-minimal', { y: 20, opacity: 0, duration: 0.75 }, '-=0.45')
    .from('.date', { y: 48, opacity: 0, scale: 0.94, duration: 1.0 }, '-=0.55')
    .from('.checker__sq, .corner-logo', { scale: 0.8, opacity: 0, duration: 0.55, stagger: 0.1 }, '-=0.5');
}

document.addEventListener('DOMContentLoaded', () => {
  createSunlightDust();
  setupProverbRotator();
  playIntroAndBlobs();
});