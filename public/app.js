/* ═══════════════════════════════════════════════════════════════════════════
   Summer Shine 3.0 — Public App Logic
   - Hero floating dots
   - Header scroll effect
   - Live name greeting
   - Form validation
   - Confetti animation
   - Registration API submit
   - Success screen
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Hero Floating Dots ───────────────────────────────────────────────────────
(function createHeroDots() {
  const container = document.getElementById('hero-dots');
  if (!container) return;
  const colors = ['#FFD93D', '#FF6B6B', '#4FC3F7', '#56C596', '#FF9A3C', '#A78BFA'];
  for (let i = 0; i < 22; i++) {
    const dot = document.createElement('span');
    const size = Math.random() * 14 + 6;
    dot.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}%;
      bottom: -20px;
      animation-duration: ${Math.random() * 10 + 8}s;
      animation-delay: ${Math.random() * 8}s;
    `;
    container.appendChild(dot);
  }
})();

// ─── Header Scroll Effect ─────────────────────────────────────────────────────
const header = document.getElementById('site-header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ─── Live Name Greeting ───────────────────────────────────────────────────────
const nameInput    = document.getElementById('student_name');
const greetingBox  = document.getElementById('name-greeting');
const GREETING_MSGS = [
  (n) => `Awesome, ${n}! Just a few more details and you're in 🎉`,
  (n) => `Hey ${n}! You're going to have an amazing time 🌟`,
  (n) => `Welcome, ${n}! Summer Shine 3.0 can't wait to meet you ☀️`,
];
let greetingIdx = 0;

nameInput.addEventListener('input', () => {
  const name = nameInput.value.trim();
  if (name.length >= 2) {
    const firstName = name.split(' ')[0];
    greetingBox.textContent = GREETING_MSGS[greetingIdx % GREETING_MSGS.length](firstName);
    greetingBox.classList.add('show');
  } else {
    greetingBox.classList.remove('show');
  }
});

nameInput.addEventListener('blur', () => { greetingIdx++; });

// ─── Inline Validation Helpers ────────────────────────────────────────────────
function showError(fieldId, errorId) {
  const field = document.getElementById(fieldId);
  const err   = document.getElementById(errorId);
  if (field) field.classList.add('invalid');
  if (err)   err.classList.add('show');
}

function clearError(fieldId, errorId) {
  const field = document.getElementById(fieldId);
  const err   = document.getElementById(errorId);
  if (field) { field.classList.remove('invalid'); field.classList.add('valid'); }
  if (err)   err.classList.remove('show');
}

function setupLiveValidation(fieldId, errorId, validator) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.addEventListener('blur', () => {
    if (validator(field.value)) clearError(fieldId, errorId);
    else showError(fieldId, errorId);
  });
  field.addEventListener('input', () => {
    if (field.classList.contains('invalid') && validator(field.value)) {
      clearError(fieldId, errorId);
    }
  });
}

setupLiveValidation('student_name',  'student_name_error',  v => v.trim().length >= 2);
setupLiveValidation('guardian_name', 'guardian_name_error', v => v.trim().length >= 2);
setupLiveValidation('contact_number','contact_number_error', v => /^\d{7,15}$/.test(v.replace(/[\s\-\+]/g, '')));
setupLiveValidation('age',           'age_error',            v => { const n = parseInt(v); return !isNaN(n) && n >= 6 && n <= 18; });
setupLiveValidation('residing_area', 'residing_area_error',  v => !!v);

// Grade validation on change
document.getElementById('grade-group').addEventListener('change', () => {
  document.getElementById('class_error').classList.remove('show');
});

// ─── Confetti Engine ──────────────────────────────────────────────────────────
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext('2d');
let confettiParticles = [];
let confettiFrame;

function resizeCanvas() {
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas, { passive: true });
resizeCanvas();

function Particle() {
  this.x     = Math.random() * confettiCanvas.width;
  this.y     = Math.random() * confettiCanvas.height - confettiCanvas.height;
  this.vx    = (Math.random() - 0.5) * 6;
  this.vy    = Math.random() * 4 + 2;
  this.vr    = (Math.random() - 0.5) * 0.2;
  this.r     = Math.random() * 0.5 + 0.25; // rotation
  this.w     = Math.random() * 12 + 6;
  this.h     = this.w * 0.45;
  this.color = ['#FFD93D','#FF6B6B','#4FC3F7','#56C596','#FF9A3C','#A78BFA','#fff'][Math.floor(Math.random()*7)];
  this.alpha = 1;
  this.life  = Math.random() * 120 + 80;
  this.age   = 0;
}

Particle.prototype.update = function() {
  this.x  += this.vx;
  this.y  += this.vy;
  this.r  += this.vr;
  this.vy += 0.06; // gravity
  this.age++;
  this.alpha = Math.max(0, 1 - this.age / this.life);
};

Particle.prototype.draw = function() {
  ctx.save();
  ctx.globalAlpha = this.alpha;
  ctx.translate(this.x, this.y);
  ctx.rotate(this.r);
  ctx.fillStyle = this.color;
  ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
  ctx.restore();
};

function launchConfetti(count = 200) {
  confettiCanvas.style.display = 'block';
  confettiParticles = Array.from({ length: count }, () => new Particle());
  animateConfetti();
}

function animateConfetti() {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles = confettiParticles.filter(p => p.alpha > 0.01);
  confettiParticles.forEach(p => { p.update(); p.draw(); });
  if (confettiParticles.length > 0) {
    confettiFrame = requestAnimationFrame(animateConfetti);
  } else {
    confettiCanvas.style.display = 'none';
  }
}

// ─── Form Submit ──────────────────────────────────────────────────────────────
const form      = document.getElementById('reg-form');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  let valid = true;

  // Validate required fields
  const name = document.getElementById('student_name').value;
  if (!name.trim() || name.trim().length < 2) { showError('student_name', 'student_name_error'); valid = false; }
  else clearError('student_name', 'student_name_error');

  const guardian = document.getElementById('guardian_name').value;
  if (!guardian.trim() || guardian.trim().length < 2) { showError('guardian_name', 'guardian_name_error'); valid = false; }
  else clearError('guardian_name', 'guardian_name_error');

  const phone = document.getElementById('contact_number').value;
  if (!/^\d{7,15}$/.test(phone.replace(/[\s\-\+]/g, ''))) { showError('contact_number', 'contact_number_error'); valid = false; }
  else clearError('contact_number', 'contact_number_error');

  const gradeRadio = document.querySelector('input[name="class"]:checked');
  if (!gradeRadio) { document.getElementById('class_error').classList.add('show'); valid = false; }
  else document.getElementById('class_error').classList.remove('show');

  const ageVal = parseInt(document.getElementById('age').value, 10);
  if (isNaN(ageVal) || ageVal < 6 || ageVal > 18) { showError('age', 'age_error'); valid = false; }
  else clearError('age', 'age_error');

  const area = document.getElementById('residing_area').value;
  if (!area) { showError('residing_area', 'residing_area_error'); valid = false; }
  else clearError('residing_area', 'residing_area_error');

  if (!valid) {
    // Scroll to first error
    const firstError = form.querySelector('.invalid, .show');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Collect activities
  const activities = Array.from(
    document.querySelectorAll('input[name="activities"]:checked')
  ).map(cb => cb.value);

  // Decode HTML entities for API payload
  const decodeHTML = (str) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  };

  const payload = {
    student_name:   name.trim(),
    guardian_name:  guardian.trim(),
    contact_number: phone.trim(),
    class:          gradeRadio.value,
    age:            ageVal,
    residing_area:  area,
    activities:     activities.map(decodeHTML),
  };

  // Button loading state
  submitBtn.disabled  = true;
  submitBtn.textContent = 'Sending… ✈️';

  try {
    const res  = await fetch('/api/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      // 🎉 Confetti burst first!
      launchConfetti(280);

      // Short delay then show success screen
      setTimeout(() => {
        form.style.display = 'none';
        const successScreen = document.getElementById('success-screen');
        successScreen.style.display = 'block';

        // Set student name
        document.getElementById('success-name').textContent = payload.student_name.split(' ')[0];

        // WhatsApp share link
        const shareText = encodeURIComponent(
          `🌟 I just registered for Summer Shine 3.0!\n\n📅 July 17, 2026\n📍 Umm Salal\n\nJoin me — register here: ${window.location.href}`
        );
        document.getElementById('share-btn').href = `https://wa.me/?text=${shareText}`;

        // Scroll to success
        document.getElementById('success-screen').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 900);

    } else {
      // Server-side validation errors
      submitBtn.disabled = false;
      submitBtn.textContent = 'Count Me In! 🎉';

      if (data.errors) {
        Object.entries(data.errors).forEach(([field, msg]) => {
          const errEl = document.getElementById(`${field}_error`);
          if (errEl) {
            errEl.textContent = msg;
            errEl.classList.add('show');
            const inputEl = document.getElementById(field);
            if (inputEl) inputEl.classList.add('invalid');
          }
        });
      } else {
        alert(data.error || 'Something went wrong. Please try again!');
      }
    }

  } catch (err) {
    console.error(err);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Count Me In! 🎉';
    alert('Network error — please check your connection and try again. 📶');
  }
});
