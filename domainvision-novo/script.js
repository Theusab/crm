const whatsappNumber = '5514991540907';

const menuButton = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Abrir menu' : 'Fechar menu');
  mainNav?.classList.toggle('is-open', !isOpen);
});

mainNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Abrir menu');
    mainNav?.classList.remove('is-open');
  });
});

document.querySelectorAll('.service-book').forEach((button) => {
  button.addEventListener('click', () => {
    const serviceField = document.querySelector('#service');
    const service = button.dataset.service;
    const option = [...serviceField.options].find((item) => item.value.startsWith(service));
    if (option) {
      serviceField.value = option.value;
      serviceField.dispatchEvent(new Event('change', { bubbles: true }));
    }
    document.querySelector('#agendar')?.scrollIntoView({ behavior: 'smooth' });
  });
});

const dateField = document.querySelector('#date');
const serviceField = document.querySelector('#service');
const timeField = document.querySelector('#time');
const availabilityButton = document.querySelector('#availability-button');
const bookingMessage = document.querySelector('.booking-message');
let confirmedAvailableSlots = null;

if (dateField) {
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  dateField.min = localToday;
}

function clearAvailability(message = 'Escolha a data e o serviço e consulte os horários livres.') {
  confirmedAvailableSlots = null;
  if (timeField) {
    timeField.replaceChildren(new Option('Escolha data e serviço', ''));
    timeField.disabled = true;
    timeField.value = '';
  }
  if (bookingMessage) bookingMessage.textContent = message;
}

dateField?.addEventListener('change', () => clearAvailability());
serviceField?.addEventListener('change', () => clearAvailability());

availabilityButton?.addEventListener('click', async () => {
  const date = dateField?.value;
  const service = serviceField?.value.split(' — ')[0];
  if (!date || !service) {
    if (bookingMessage) bookingMessage.textContent = 'Escolha primeiro o serviço e a data para consultar a agenda.';
    (!service ? serviceField : dateField)?.focus();
    return;
  }

  availabilityButton.disabled = true;
  availabilityButton.classList.add('is-loading');
  availabilityButton.setAttribute('aria-busy', 'true');
  if (bookingMessage) bookingMessage.textContent = 'Consultando a agenda do barbeiro…';
  if (timeField) {
    timeField.replaceChildren(new Option('Buscando horários…', ''));
    timeField.disabled = true;
  }

  try {
    const response = await fetch(`/api/availability?date=${encodeURIComponent(date)}&service=${encodeURIComponent(service)}`, { headers: { Accept: 'application/json' } });
    const result = await response.json();
    if (response.ok && Array.isArray(result.slots)) {
      confirmedAvailableSlots = result.slots.map((slot) => slot.start);
      timeField?.replaceChildren(new Option(confirmedAvailableSlots.length ? 'Selecione um horário livre' : 'Sem horários livres nesta data', ''));
      confirmedAvailableSlots.forEach((time) => timeField?.add(new Option(`${time} — livre`, time)));
      if (timeField) timeField.disabled = confirmedAvailableSlots.length === 0;
      if (bookingMessage) bookingMessage.textContent = confirmedAvailableSlots.length
        ? 'Horários livres consultados no Google Calendar. A vaga só fica reservada após confirmação pelo WhatsApp.'
        : 'A agenda não tem horários livres nessa data. Tente outro dia.';
    } else {
      useWhatsAppPreference(result.code === 'calendar_not_configured'
        ? 'A consulta ao Google Calendar ainda precisa ser configurada. Você pode enviar uma preferência pelo WhatsApp, sujeita à confirmação.'
        : (result.message || 'Não foi possível consultar a agenda. Você pode enviar uma preferência pelo WhatsApp, sujeita à confirmação.'));
    }
  } catch {
    useWhatsAppPreference('Não foi possível consultar a agenda agora. Escolha uma preferência e confirme pelo WhatsApp.');
  } finally {
    availabilityButton.disabled = false;
    availabilityButton.classList.remove('is-loading');
    availabilityButton.removeAttribute('aria-busy');
  }
});

function useWhatsAppPreference(message) {
  confirmedAvailableSlots = null;
  if (timeField) {
    timeField.replaceChildren(new Option('Escolha sua preferência', ''));
    for (let hour = 9; hour <= 18; hour += 1) {
      const value = `${String(hour).padStart(2, '0')}:00`;
      timeField.add(new Option(`${value} — preferência, confirmar`, value));
    }
    timeField.disabled = false;
  }
  if (bookingMessage) bookingMessage.textContent = message;
}

const bookingForm = document.querySelector('#booking-form');
function formatGoogleDate(date, time) {
  return new Date(`${date}T${time}:00-03:00`).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcs(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function buildCalendarUrl({ date, time, end, service, customer }) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${service} — Domain Vision`,
    dates: `${formatGoogleDate(date, time)}/${formatGoogleDate(date, end)}`,
    details: `Agendamento solicitado por ${customer}. Serviço: ${service}. Rua Principal, 100, Pederneiras — SP. Confirme pelo WhatsApp: +55 (14) 99154-0907.`,
    location: 'Rua Principal, 100, Pederneiras - SP',
    ctz: 'America/Sao_Paulo',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildIcs({ date, time, end, eventId, service, customer }) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Domain Vision//Barbearia//PT-BR',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${eventId}@domainvision.vercel.app`, `DTSTAMP:${stamp}`,
    `DTSTART:${formatGoogleDate(date, time)}`, `DTEND:${formatGoogleDate(date, end)}`,
    `SUMMARY:${escapeIcs(`${service} — Domain Vision`)}`,
    `DESCRIPTION:${escapeIcs(`Agendamento solicitado por ${customer}. Confirme pelo WhatsApp: +55 (14) 99154-0907.`)}`,
    `LOCATION:${escapeIcs('Rua Principal, 100, Pederneiras - SP')}`,
    'STATUS:TENTATIVE', 'END:VEVENT', 'END:VCALENDAR', ''
  ];
  return lines.join('\r\n');
}

function showBookingResult(appointment, customer) {
  if (!bookingMessage) return;
  bookingMessage.replaceChildren(document.createTextNode('Pedido salvo como evento provisório no calendário do Davi. Adicione à sua agenda e confirme pelo WhatsApp.'));
  const actions = document.createElement('div');
  actions.className = 'booking-actions';

  const googleLink = document.createElement('a');
  googleLink.className = 'text-link';
  googleLink.href = buildCalendarUrl({ ...appointment, customer });
  googleLink.target = '_blank';
  googleLink.rel = 'noopener noreferrer';
  googleLink.textContent = 'Adicionar ao Google Calendar ↗';

  const icsLink = document.createElement('a');
  icsLink.className = 'text-link';
  icsLink.href = URL.createObjectURL(new Blob([buildIcs({ ...appointment, customer })], { type: 'text/calendar;charset=utf-8' }));
  icsLink.download = 'domainvision-agendamento.ics';
  icsLink.textContent = 'Baixar evento (.ics) ↓';

  const whatsappText = [
    'Olá! Solicitei um agendamento na Domain Vision.',
    `Nome: ${customer}`,
    `Serviço: ${appointment.service}`,
    `Barbeiro: Davi`,
    `Data: ${new Date(`${appointment.date}T12:00:00-03:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })}`,
    `Horário: ${appointment.time}`,
    'O evento provisório foi salvo no calendário do barbeiro. Aguardo a confirmação. Obrigado!'
  ].join('\n');
  const whatsappLink = document.createElement('a');
  whatsappLink.className = 'text-link';
  whatsappLink.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}`;
  whatsappLink.target = '_blank';
  whatsappLink.rel = 'noopener noreferrer';
  whatsappLink.textContent = 'Confirmar pelo WhatsApp ↗';

  actions.append(googleLink, icsLink, whatsappLink);
  bookingMessage.append(actions);
}

function showWhatsAppFallback(messageText, whatsappUrl) {
  if (!bookingMessage) return;
  bookingMessage.replaceChildren(document.createTextNode(messageText));
  const link = document.createElement('a');
  link.className = 'text-link';
  link.href = whatsappUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Continuar pelo WhatsApp ↗';
  link.style.marginTop = '10px';
  bookingMessage.append(document.createElement('br'), link);
}

bookingForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(bookingForm);
  const dateValue = String(formData.get('date') || '');
  const appointmentDate = new Date(`${dateValue}T12:00:00-03:00`);
  const time = String(formData.get('time'));

  if (appointmentDate.getDay() === 0) {
    if (bookingMessage) bookingMessage.textContent = 'A barbearia atende de segunda a sábado. Escolha outro dia para o seu horário.';
    dateField?.focus();
    return;
  }
  if (!time || time === 'null') {
    if (bookingMessage) bookingMessage.textContent = 'Consulte e escolha um horário antes de continuar.';
    availabilityButton?.focus();
    return;
  }
  if (time < '09:00' || time > '19:30') {
    if (bookingMessage) bookingMessage.textContent = 'Escolha um horário entre 09:00 e 18:00.';
    document.querySelector('#time')?.focus();
    return;
  }
  if (confirmedAvailableSlots && !confirmedAvailableSlots.includes(time)) {
    if (bookingMessage) bookingMessage.textContent = 'Consulte novamente os horários antes de continuar.';
    clearAvailability();
    return;
  }

  const customer = String(formData.get('customer') || '').trim();
  const service = String(formData.get('service') || '').split(' — ')[0];
  const date = appointmentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  const text = [
    'Olá! Gostaria de solicitar um agendamento na Domain Vision.',
    'Nome: ' + customer,
    'Serviço: ' + service,
    'Barbeiro: Davi',
    'Data desejada: ' + date,
    'Horário desejado: ' + time,
    'Disponibilidade: horário será confirmado pela barbearia.',
    'Aguardo a confirmação. Obrigado!'
  ].join('\n');
  const whatsappUrl = 'https://wa.me/' + whatsappNumber + '?text=' + encodeURIComponent(text);

  const submitButton = bookingForm.querySelector('.booking-submit');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Salvando evento…';
  }
  if (bookingMessage) bookingMessage.textContent = 'Confirmando disponibilidade e salvando o evento provisório…';

  try {
    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ customer, service, date: dateValue, time, website: String(formData.get('website') || '') }),
    });
    const result = await response.json();
    if (response.ok && result.eventId) {
      showBookingResult(result, customer);
    } else {
      const reason = result.code === 'slot_taken'
        ? 'Esse horário acabou de ficar indisponível. Consulte outra vez antes de escolher.'
        : (result.message || 'Não foi possível salvar o evento. Você ainda pode solicitar pelo WhatsApp.');
      showWhatsAppFallback(`${reason} Nenhum evento foi salvo no calendário.`, whatsappUrl);
    }
  } catch {
    showWhatsAppFallback('Não foi possível conectar ao calendário agora. Nenhum evento foi salvo; você pode solicitar pelo WhatsApp.', whatsappUrl);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Solicitar agendamento <span aria-hidden="true">↗</span>';
    }
  }
});

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const revealItems = document.querySelectorAll('[data-reveal]');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (revealItems.length && !prefersReducedMotion && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('motion-ready');
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  revealItems.forEach((item) => revealObserver.observe(item));
}
