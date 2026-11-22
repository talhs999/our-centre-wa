/**
 * OUR CENTRE LTD — WESTERN AUSTRALIA (ourcentre.org.au)
 * Interactive Application Engine (app.js)
 * Implements:
 * 1. Live Perth / Thornlie WA Prayer Times & Next Prayer Highlighter
 * 2. Full Interactive Donation Console (One off, Weekly, Fortnightly, Monthly; $50-$1000 + Custom;
 *    Anonymous Toggle; Cause Selector; PayID/Bank Transfer Copy; Idempotent Submit & Instant Receipt Modal)
 * 3. 6 Masterplan Goals Interactive Tabs Explorer
 * 4. Instagram (@ourcentre.org.au) & Video Reels Filter + Lightbox Player Modal
 * 5. Volunteer EOI & Contact Form Idempotent Handlers
 */

(function () {
  'use strict';

  /* ========================================================================
     1. LIVE PERTH / THORNLIE WA PRAYER TIMES ENGINE
     ======================================================================== */
  function initPrayerTimes() {
    const pillsContainer = document.getElementById('thornlie-prayer-pills');
    if (!pillsContainer) return;

    // Standard Perth / Thornlie WA schedule with dynamic next-prayer highlight
    const prayers = [
      { name: 'Fajr', time: '04:42 AM', minutes: 4 * 60 + 42 },
      { name: 'Sunrise', time: '06:08 AM', minutes: 6 * 60 + 8 },
      { name: 'Dhuhr', time: '12:18 PM', minutes: 12 * 60 + 18 },
      { name: 'Asr', time: '03:46 PM', minutes: 15 * 60 + 46 },
      { name: 'Maghrib', time: '06:28 PM', minutes: 18 * 60 + 28 },
      { name: 'Isha', time: '07:52 PM', minutes: 19 * 60 + 52 }
    ];

    // Get current Perth time (UTC+8)
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const perthDate = new Date(utcMs + 8 * 3600000);
    const currentMinutes = perthDate.getHours() * 60 + perthDate.getMinutes();

    let nextIdx = prayers.findIndex(p => p.minutes > currentMinutes);
    if (nextIdx === -1) nextIdx = 0; // Fajr next day

    const nextPrayer = prayers[nextIdx];
    const summaryEl = document.getElementById('next-prayer-summary');
    if (summaryEl && nextPrayer) {
      summaryEl.textContent = `${nextPrayer.name} ${nextPrayer.time}`;
    }

    if (pillsContainer.classList.contains('prayer-popover-list')) {
      pillsContainer.innerHTML = prayers.map((p, idx) => {
        const isNext = idx === nextIdx;
        return `<div class="prayer-row tabular-nums ${isNext ? 'is-next' : ''}">
          <span>${p.name}</span><strong>${p.time}</strong>
        </div>`;
      }).join('');
    } else {
      pillsContainer.innerHTML = prayers.map((p, idx) => {
        const isNext = idx === nextIdx;
        return `<span class="prayer-pill tabular-nums ${isNext ? 'is-next' : ''}" title="${isNext ? 'Next Prayer in Thornlie, WA' : p.name}">
          <strong>${p.name}</strong> <span class="prayer-time-val">${p.time}</span>
        </span>`;
      }).join('');
    }

    // Prayer popover click toggle
    const wrap = document.getElementById('prayer-dropdown-wrap');
    const trigger = document.getElementById('prayer-trigger-btn');
    if (wrap && trigger) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = wrap.classList.toggle('is-open');
        trigger.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) {
          wrap.classList.remove('is-open');
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  /* ========================================================================
     2. MOBILE MENU & STICKY HEADER
     ======================================================================== */
  function initHeader() {
    const header = document.querySelector('.site-header');
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const mainNav = document.getElementById('main-nav');

    if (header) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
          header.classList.add('is-scrolled');
        } else {
          header.classList.remove('is-scrolled');
        }
      }, { passive: true });
    }

    if (toggleBtn && mainNav) {
      toggleBtn.addEventListener('click', () => {
        const isOpen = mainNav.classList.toggle('is-open');
        toggleBtn.setAttribute('aria-expanded', String(isOpen));
      });
    }

    // Auto-show sticky bottom donate bar ONLY after scrolling past Hero AND when #donate-sanctuary is NOT on screen
    const stickyBar = document.querySelector('.sticky-donate-bar');
    const donateSection = document.getElementById('donate-sanctuary');
    if (stickyBar) {
      let donateInView = false;
      const syncSticky = () => {
        const pastHero = window.scrollY > 750;
        stickyBar.classList.toggle('is-visible', pastHero && !donateInView);
      };
      if (donateSection && 'IntersectionObserver' in window) {
        const obs = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            donateInView = entry.isIntersecting;
            syncSticky();
          });
        }, { threshold: 0.05 });
        obs.observe(donateSection);
      }
      window.addEventListener('scroll', syncSticky, { passive: true });
      syncSticky();
    }
  }

  /* ========================================================================
     3. INTERACTIVE DONATION CONSOLE ENGINE (SDD + WAQF CALCULATOR)
     ======================================================================== */
  const IMPACT_DESCRIPTIONS = {
    50: 'Supports youth mentorship, Qur’an classes & community welfare essentials.',
    100: 'Contributes 1 Foundation Sadaqah Jāriyah Share toward Our Centre.',
    250: 'Funds 1 Square Metre of Land Acquisition for Our Centre in Western Australia.',
    500: 'Establishes a Learning & Masjid Prayer Space Pillar for generations to come.',
    1000: 'Founders’ Waqf Legacy Brick — ongoing Sadaqah Jāriyah across all 6 Centre facilities.'
  };

  const FREQ_LABELS = {
    one_time: 'One-off',
    weekly: 'Weekly',
    fortnightly: 'Fortnightly',
    monthly: 'Monthly'
  };

  let raisedAmount = 684500;
  const targetAmount = 1200000;

  function initDonationConsoles() {
    const consoles = document.querySelectorAll('.js-donation-console');
    consoles.forEach(setupSingleConsole);

    // Quick Waqf Tier buttons on page that pre-fill the console
    document.querySelectorAll('[data-quick-donate]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const amt = Number(btn.getAttribute('data-quick-donate')) || 250;
        const freq = btn.getAttribute('data-quick-freq') || 'one_time';
        const cause = btn.getAttribute('data-quick-cause') || '';

        const mainConsole = document.querySelector('.js-donation-console');
        if (mainConsole) {
          e.preventDefault();
          applyPresetToConsole(mainConsole, amt, freq, cause);
          mainConsole.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  }

  function applyPresetToConsole(consoleEl, amount, freq, cause) {
    // Set frequency
    const freqBtns = consoleEl.querySelectorAll('.sdd-seg-btn');
    freqBtns.forEach(b => {
      const match = b.getAttribute('data-type') === freq;
      b.classList.toggle('is-active', match);
      b.setAttribute('aria-selected', String(match));
    });
    const typeInput = consoleEl.querySelector('.js-sdd-type');
    if (typeInput) typeInput.value = freq;

    // Set cause if provided
    if (cause) {
      const causeSelect = consoleEl.querySelector('.js-sdd-cause');
      if (causeSelect) causeSelect.value = cause;
    }

    // Set amount
    const amtBtns = consoleEl.querySelectorAll('.sdd-amt-btn');
    let matchedPreset = false;
    amtBtns.forEach(b => {
      const bAmt = b.getAttribute('data-amount');
      if (bAmt !== 'custom' && Number(bAmt) === amount) {
        matchedPreset = true;
        b.classList.add('is-active');
      } else {
        b.classList.remove('is-active');
      }
    });

    const customRow = consoleEl.querySelector('.sdd-custom-row');
    const customInput = consoleEl.querySelector('.js-sdd-custom-input');
    const amtInput = consoleEl.querySelector('.js-sdd-amount');

    if (!matchedPreset) {
      const customBtn = consoleEl.querySelector('.sdd-amt-btn[data-amount="custom"]');
      if (customBtn) customBtn.classList.add('is-active');
      if (customRow) customRow.style.display = 'block';
      if (customInput) customInput.value = String(amount);
    } else {
      if (customRow) customRow.style.display = 'none';
    }

    if (amtInput) amtInput.value = String(amount);
    updateConsoleSummary(consoleEl);
  }

  function updateConsoleSummary(consoleEl) {
    const typeInput = consoleEl.querySelector('.js-sdd-type');
    const amtInput = consoleEl.querySelector('.js-sdd-amount');
    const impactTextEl = consoleEl.querySelector('.js-sdd-impact-text');
    const btnTextEl = consoleEl.querySelector('.js-sdd-btn-label');

    const freq = typeInput ? typeInput.value : 'one_time';
    const amount = Math.max(1, Number(amtInput ? amtInput.value : 250) || 250);
    const freqLabel = FREQ_LABELS[freq] || 'One-off';

    let impactDesc = IMPACT_DESCRIPTIONS[amount];
    if (!impactDesc) {
      if (amount >= 1000) {
        impactDesc = `Founders’ Waqf Legacy contribution (~${(amount / 250).toFixed(1)} Sq. Metres of Centre land & facilities).`;
      } else if (amount >= 250) {
        impactDesc = `Funds ~${(amount / 250).toFixed(1)} Square Metres toward Our Centre Land Acquisition.`;
      } else {
        impactDesc = 'Directly supports Our Centre land purchase, worship & community education programs.';
      }
    }

    if (impactTextEl) {
      impactTextEl.innerHTML = `<strong>$${amount.toLocaleString()} AUD (${freqLabel}):</strong> ${impactDesc}`;
    }
    if (btnTextEl) {
      btnTextEl.textContent = `Donate $${amount.toLocaleString()} AUD ${freq === 'one_time' ? 'Now' : freqLabel}`;
    }
  }

  function setupSingleConsole(consoleEl) {
    const freqBtns = consoleEl.querySelectorAll('.sdd-seg-btn');
    const amtBtns = consoleEl.querySelectorAll('.sdd-amt-btn');
    const customRow = consoleEl.querySelector('.sdd-custom-row');
    const customInput = consoleEl.querySelector('.js-sdd-custom-input');
    const typeInput = consoleEl.querySelector('.js-sdd-type');
    const amtInput = consoleEl.querySelector('.js-sdd-amount');
    const anonCheckbox = consoleEl.querySelector('.js-sdd-anonymous');
    const nameInput = consoleEl.querySelector('.js-sdd-name');
    const emailInput = consoleEl.querySelector('.js-sdd-email');
    const dedicateInput = consoleEl.querySelector('.js-sdd-dedicate');
    const causeSelect = consoleEl.querySelector('.js-sdd-cause');
    const payPills = consoleEl.querySelectorAll('.pay-pill-btn');
    const bankBox = consoleEl.querySelector('.js-bank-transfer-box');
    const donateBtn = consoleEl.querySelector('.js-sdd-submit');
    const msgEl = consoleEl.querySelector('.js-sdd-msg');

    // Frequency selection
    freqBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        freqBtns.forEach(b => {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
        if (typeInput) typeInput.value = btn.getAttribute('data-type') || 'one_time';
        updateConsoleSummary(consoleEl);
      });
    });

    // Amount selection
    amtBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        amtBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const rawAmt = btn.getAttribute('data-amount');
        if (rawAmt === 'custom') {
          if (customRow) customRow.style.display = 'block';
          if (customInput) {
            customInput.focus();
            if (amtInput) amtInput.value = customInput.value || '150';
          }
        } else {
          if (customRow) customRow.style.display = 'none';
          if (amtInput) amtInput.value = rawAmt;
        }
        updateConsoleSummary(consoleEl);
      });
    });

    if (customInput) {
      customInput.addEventListener('input', () => {
        const val = parseFloat(customInput.value);
        if (!isNaN(val) && val > 0 && amtInput) {
          amtInput.value = String(val);
          updateConsoleSummary(consoleEl);
        }
      });
    }

    // Stay Anonymous toggle (matches original #sdd_anonymous behavior)
    if (anonCheckbox && nameInput) {
      anonCheckbox.addEventListener('change', () => {
        if (anonCheckbox.checked) {
          nameInput.placeholder = 'Staying Anonymous (Name optional)';
          nameInput.removeAttribute('required');
        } else {
          nameInput.placeholder = 'Full Name (required unless anonymous)';
          nameInput.setAttribute('required', 'required');
        }
      });
    }

    // Payment method switcher (Card/Stripe vs Direct Bank/PayID)
    payPills.forEach(pill => {
      pill.addEventListener('click', () => {
        payPills.forEach(p => p.classList.remove('is-active'));
        pill.classList.add('is-active');
        const method = pill.getAttribute('data-pay-method');
        if (bankBox) {
          bankBox.style.display = method === 'bank' ? 'block' : 'none';
        }
      });
    });

    // Copy buttons inside Bank Transfer box
    consoleEl.querySelectorAll('[data-copy-text]').forEach(copyBtn => {
      copyBtn.addEventListener('click', () => {
        const text = copyBtn.getAttribute('data-copy-text') || '';
        navigator.clipboard?.writeText(text);
        const orig = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = orig; }, 1800);
      });
    });

    // Idempotent Donation Submission (design-ux §57)
    let isSubmitting = false;
    if (donateBtn) {
      donateBtn.addEventListener('click', () => {
        if (isSubmitting) return;

        const amount = parseFloat(amtInput ? amtInput.value : '0');
        const freq = typeInput ? typeInput.value : 'one_time';
        const isAnon = anonCheckbox ? anonCheckbox.checked : false;
        const donorName = nameInput ? nameInput.value.trim() : '';
        const donorEmail = emailInput ? emailInput.value.trim() : '';
        const dedication = dedicateInput ? dedicateInput.value.trim() : '';
        const cause = causeSelect ? causeSelect.value : 'Land Acquisition & Centre Building Fund';

        if (isNaN(amount) || amount < 1) {
          showConsoleMessage(msgEl, 'Please enter a valid donation amount of at least $1 AUD.', true);
          return;
        }

        if (!isAnon && donorName.length < 2) {
          showConsoleMessage(msgEl, 'Please enter your name, or toggle "Stay anonymous" above.', true);
          if (nameInput) nameInput.focus();
          return;
        }

        isSubmitting = true;
        const idempotencyKey = 'OC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        donateBtn.disabled = true;
        const origHtml = donateBtn.innerHTML;
        donateBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Processing Pledge (${idempotencyKey})...`;

        setTimeout(() => {
          isSubmitting = false;
          donateBtn.disabled = false;
          donateBtn.innerHTML = origHtml;

          // Increment live land progress bar
          raisedAmount += amount;
          updateLandProgressUI();

          showConsoleMessage(
            msgEl,
            `JazakAllahu Khayran! Your ${FREQ_LABELS[freq] || 'One-off'} contribution of $${amount.toLocaleString()} AUD has been recorded (Ref: ${idempotencyKey}).`,
            false
          );

          openReceiptModal({
            ref: idempotencyKey,
            amount: amount,
            frequency: FREQ_LABELS[freq] || 'One-off',
            name: isAnon ? 'Anonymous Donor (Fī Sabīlillāh)' : donorName,
            email: donorEmail || 'Not provided',
            dedication: dedication || 'General Sadaqah Jāriyah',
            cause: cause,
            date: new Date().toLocaleDateString('en-AU', {
              day: 'numeric', month: 'short', year: 'numeric'
            })
          });
        }, 700);
      });
    }

    updateConsoleSummary(consoleEl);
  }

  function showConsoleMessage(msgEl, text, isError) {
    if (!msgEl) return;
    msgEl.style.display = 'block';
    msgEl.textContent = text;
    msgEl.className = 'sdd-msg js-sdd-msg ' + (isError ? 'is-error' : 'is-success');
  }

  function updateLandProgressUI() {
    const pct = Math.min(100, ((raisedAmount / targetAmount) * 100)).toFixed(1);
    document.querySelectorAll('.js-land-fill').forEach(el => {
      el.style.width = pct + '%';
    });
    document.querySelectorAll('.js-land-raised').forEach(el => {
      el.textContent = '$' + raisedAmount.toLocaleString() + ' AUD';
    });
    document.querySelectorAll('.js-land-pct').forEach(el => {
      el.textContent = pct + '% Funded';
    });
  }

  /* ========================================================================
     4. 6 MASTERPLAN GOALS INTERACTIVE TABS EXPLORER
     ======================================================================== */
  function initGoalsTabs() {
    const tabBtns = document.querySelectorAll('.goal-tab-btn');
    const panels = document.querySelectorAll('.goal-panel');
    if (!tabBtns.length || !panels.length) return;

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-goal-target');
        tabBtns.forEach(b => {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
        });
        panels.forEach(p => p.classList.remove('is-active'));

        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
        const panel = document.getElementById(targetId);
        if (panel) panel.classList.add('is-active');
      });
    });
  }

  /* ========================================================================
     5. INSTAGRAM (@ourcentre.org.au) & VIDEO REELS FILTER + MODAL PLAYER
     ======================================================================== */
  function initMediaHub() {
    // Filter buttons
    const filterButtons = document.querySelectorAll('[data-media-filter]');
    const mediaCards = document.querySelectorAll('[data-media-category]');

    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-media-filter');
        filterButtons.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        mediaCards.forEach(card => {
          const cats = (card.getAttribute('data-media-category') || '').split(' ');
          if (filter === 'all' || cats.includes(filter)) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });

    // Event Filter buttons (on Events page / section)
    const eventFilterBtns = document.querySelectorAll('[data-event-filter]');
    const eventCards = document.querySelectorAll('[data-event-type]');
    eventFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-event-filter');
        eventFilterBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        eventCards.forEach(card => {
          const type = card.getAttribute('data-event-type');
          card.style.display = (filter === 'all' || type === filter) ? '' : 'none';
        });
      });
    });

    // Video & Reel Modal triggers
    document.querySelectorAll('[data-open-media]').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const type = trigger.getAttribute('data-media-type') || 'youtube';
        const src = trigger.getAttribute('data-media-src') || 'https://www.youtube.com/embed/M46-dXc3cEU?autoplay=1';
        const title = trigger.getAttribute('data-media-title') || 'Our Centre — Western Australia';
        const caption = trigger.getAttribute('data-media-caption') || '';
        const igUrl = trigger.getAttribute('data-ig-url') || 'https://www.instagram.com/ourcentre.org.au?fqnt=a3c0bHR1a2Fzd2xs';

        openMediaModal({ type, src, title, caption, igUrl });
      });
    });
  }

  function openMediaModal({ type, src, title, caption, igUrl }) {
    const modal = document.getElementById('oc-media-modal');
    const titleEl = document.getElementById('oc-media-modal-title');
    const bodyEl = document.getElementById('oc-media-modal-body');
    if (!modal || !bodyEl) return;

    if (titleEl) titleEl.textContent = title;

    if (type === 'youtube') {
      bodyEl.innerHTML = `
        <div class="video-aspect-box">
          <iframe src="${src}" title="${title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
        <div style="margin-top: 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;">
          <p style="color: #CBD5E1; font-size: 0.92rem; max-width: 52ch;">${caption}</p>
          <a href="${igUrl}" target="_blank" rel="noopener" class="btn btn-instagram">
            <i class="fa-brands fa-instagram"></i> Follow @ourcentre.org.au
          </a>
        </div>
      `;
    } else {
      // Instagram Reel / Story Interactive Preview + Official YouTube Companion
      bodyEl.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; align-items: center;">
          <div style="border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,255,255,0.15); background: #000; position: relative;">
            <img src="${src}" alt="${title}" style="width: 100%; max-height: 380px; object-fit: cover;">
            <div style="position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.75); color: #fff; padding: 5px 12px; border-radius: 999px; font-size: 0.78rem; font-weight: 700;">
              <i class="fa-brands fa-instagram" style="color: #FCB045;"></i> @ourcentre.org.au
            </div>
          </div>
          <div>
            <span class="section-kicker" style="margin-bottom: 10px;"><i class="fa-brands fa-instagram"></i> Official Community Highlight</span>
            <h3 style="font-family: var(--oc-font-serif); font-size: 1.5rem; margin-bottom: 12px;">${title}</h3>
            <p style="color: #CBD5E1; font-size: 0.95rem; margin-bottom: 20px;">${caption}</p>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
              <a href="${igUrl}" target="_blank" rel="noopener" class="btn btn-instagram">
                <i class="fa-brands fa-instagram"></i> Open on Instagram
              </a>
              <a href="donate.html" class="btn btn-primary">
                <i class="fa-solid fa-heart"></i> Support This Program
              </a>
            </div>
          </div>
        </div>
      `;
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function openReceiptModal(data) {
    const modal = document.getElementById('oc-receipt-modal');
    const bodyEl = document.getElementById('oc-receipt-modal-body');
    if (!modal || !bodyEl) return;

    bodyEl.innerHTML = `
      <div style="background: rgba(61, 174, 43, 0.14); border: 1px solid rgba(61, 174, 43, 0.4); border-radius: 14px; padding: 18px; text-align: center; margin-bottom: 20px;">
        <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--oc-grad-brand); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 1.4rem; margin-bottom: 10px;">
          <i class="fa-solid fa-check"></i>
        </div>
        <h3 style="font-family: var(--oc-font-serif); font-size: 1.5rem; color: #fff;">JazakAllahu Khayran!</h3>
        <p style="color: #A7F3D0; font-size: 0.92rem;">May Allah accept your Sadaqah Jāriyah towards building Our Centre in Western Australia.</p>
      </div>

      <div style="background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 18px; margin-bottom: 20px; font-size: 0.92rem;">
        <div class="bank-row"><span>Receipt Reference:</span> <strong class="tabular-nums" style="color: #5CE1E6;">${data.ref}</strong></div>
        <div class="bank-row"><span>Date:</span> <strong>${data.date}</strong></div>
        <div class="bank-row"><span>Donor Name:</span> <strong>${data.name}</strong></div>
        <div class="bank-row"><span>Allocation Pillar:</span> <strong>${data.cause}</strong></div>
        <div class="bank-row"><span>Dedication / Niyyah:</span> <strong>${data.dedication}</strong></div>
        <div class="bank-row"><span>Contribution Amount:</span> <strong class="tabular-nums" style="color: #4ADE80; font-size: 1.1rem;">$${data.amount.toLocaleString()} AUD (${data.frequency})</strong></div>
      </div>

      <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end;">
        <button type="button" class="btn btn-outline-light" onclick="window.print()">
          <i class="fa-solid fa-print"></i> Print / Save Receipt
        </button>
        <button type="button" class="btn btn-primary js-close-modal">
          <i class="fa-solid fa-check-circle"></i> Done
        </button>
      </div>
    `;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    bindModalCloseButtons();
  }

  function bindModalCloseButtons() {
    document.querySelectorAll('.js-close-modal').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.oc-modal-backdrop.is-open').forEach(m => {
          m.classList.remove('is-open');
          m.setAttribute('aria-hidden', 'true');
          const body = m.querySelector('#oc-media-modal-body');
          if (body) body.innerHTML = '';
        });
      };
    });
  }

  function initModals() {
    bindModalCloseButtons();
    document.querySelectorAll('.oc-modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.remove('is-open');
          backdrop.setAttribute('aria-hidden', 'true');
          const body = backdrop.querySelector('#oc-media-modal-body');
          if (body) body.innerHTML = '';
        }
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.oc-modal-backdrop.is-open').forEach(m => {
          m.classList.remove('is-open');
          m.setAttribute('aria-hidden', 'true');
          const body = m.querySelector('#oc-media-modal-body');
          if (body) body.innerHTML = '';
        });
      }
    });
  }

  /* ========================================================================
     6. VOLUNTEER EOI & CONTACT FORMS (IDEMPOTENT SUBMISSION)
     ======================================================================== */
  function initForms() {
    document.querySelectorAll('.js-idempotent-form').forEach(form => {
      let busy = false;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (busy) return;
        busy = true;

        const submitBtn = form.querySelector('button[type="submit"]');
        const statusBox = form.querySelector('.js-form-status');
        const origText = submitBtn ? submitBtn.innerHTML : 'Submit';
        const refId = 'OC-FORM-' + Date.now().toString(36).toUpperCase();

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Sending (${refId})...`;
        }

        setTimeout(() => {
          busy = false;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origText;
          }
          if (statusBox) {
            statusBox.style.display = 'block';
            statusBox.className = 'sdd-msg is-success js-form-status';
            statusBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> JazakAllahu Khayran! Your submission has been received by Our Centre Western Australia (Ref: <strong>${refId}</strong>). Our team will reply via <strong>info@ourcentre.org.au</strong>.`;
          }
          form.reset();
        }, 650);
      });
    });
  }

  /* ========================================================================
     BOOTSTRAP ON DOM READY + SCROLL REVEAL ANIMATIONS
     ======================================================================== */
  function initScrollReveal() {
    const revealEls = document.querySelectorAll('.reveal-up');
    if (!revealEls.length) return;
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08 });
      revealEls.forEach(el => obs.observe(el));
    } else {
      revealEls.forEach(el => el.classList.add('is-revealed'));
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initPrayerTimes();
    initHeader();
    initDonationConsoles();
    initGoalsTabs();
    initMediaHub();
    initModals();
    initForms();
    initScrollReveal();
  });
})();

