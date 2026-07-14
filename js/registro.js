const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyy4E3bKfZrNAy8KU4liwpkRvzpX3H7JvXaqDnArNGjr2a-3WZhWIfvtSJyNUP6djuN/exec';
const TOKEN = 'k5o1u0m3wEuUsulc49zD3dr1fxhlSITr';

/* ── Formulario general de registro ── */
(function () {
  const formGeneral = document.getElementById('regFormGeneral');
  if (!formGeneral) return;

  const gNombre             = document.getElementById('gNombre');
  const gCorreo             = document.getElementById('gCorreo');
  const gCelular            = document.getElementById('gCelular');
  const gPais               = document.getElementById('gPais');
  const gUniversidad        = document.getElementById('gUniversidad');
  const gPuesto             = document.getElementById('gPuesto');
  const gGafete             = document.getElementById('gGafete');
  const gAlergiaDetalleWrap = document.getElementById('gAlergiaDetalleWrap');
  const gAlergiaDetalle     = document.getElementById('gAlergiaDetalle');
  const gFacturacion        = document.getElementById('gFacturacion');
  const gSubmit             = document.getElementById('gSubmit');
  const gBtnText            = gSubmit.querySelector('.reg-btn-text');
  const gBtnLoading         = gSubmit.querySelector('.reg-btn-loading');
  const gMsg                = document.getElementById('gMsg');

  gCelular.addEventListener('input', () => {
    gCelular.value = gCelular.value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
    gCelular.classList.remove('error');
    hideGMsg();
  });

  gCorreo.addEventListener('input', () => {
    gCorreo.classList.remove('error');
    hideGMsg();
  });

  formGeneral.querySelectorAll('input[name="alergia"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const show = radio.value === 'Sí' && radio.checked;
      gAlergiaDetalleWrap.hidden  = !show;
      gAlergiaDetalle.required    = show;
      gAlergiaDetalle.disabled    = !show;
      if (!show) gAlergiaDetalle.value = '';
    });
  });

  function showGMsg(text, type) {
    gMsg.textContent = (type === 'success' ? '✓ ' : '✗ ') + text;
    gMsg.className   = `reg-msg ${type === 'success' ? 'success' : 'error-msg'}`;
    gMsg.removeAttribute('hidden');
  }

  function hideGMsg() {
    gMsg.setAttribute('hidden', '');
    gMsg.className = 'reg-msg';
  }

  function validateGeneral() {
    let ok = true;
    [gNombre, gCorreo, gCelular, gPais, gUniversidad, gPuesto, gGafete, gAlergiaDetalle].forEach(el => el.classList.remove('error'));

    [gNombre, gCelular, gPuesto, gGafete].forEach(el => {
      if (!el.value.trim()) { el.classList.add('error'); ok = false; }
    });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gCorreo.value.trim())) {
      gCorreo.classList.add('error'); ok = false;
    }
    if (!gPais.value)        { gPais.classList.add('error');        ok = false; }
    if (!gUniversidad.value) { gUniversidad.classList.add('error'); ok = false; }
    if (!formGeneral.querySelector('input[name="alergia"]:checked')) ok = false;
    if (!gAlergiaDetalleWrap.hidden && !gAlergiaDetalle.value.trim()) {
      gAlergiaDetalle.classList.add('error'); ok = false;
    }

    if (!ok) showGMsg('Por favor completa todos los campos requeridos.', 'error');
    return ok;
  }

  function localKeyG(campo, valor) { return `reg-g::${campo}::${valor.toLowerCase()}`; }
  function localRegistradoG(campo, valor) { return localStorage.getItem(localKeyG(campo, valor)) === '1'; }
  function marcarRegistradoG(correo, celular) {
    localStorage.setItem(localKeyG('correo',  correo),  '1');
    localStorage.setItem(localKeyG('celular', celular), '1');
  }

  async function servidorDuplicadoG(correo, celular) {
    try {
      const url = `${WEBHOOK_URL}?tipo=registro-general&correo=${encodeURIComponent(correo)}&celular=${encodeURIComponent(celular)}`;
      const res  = await fetch(url);
      return await res.json();
    } catch {
      return { correo: false, celular: false };
    }
  }

  formGeneral.addEventListener('submit', async e => {
    e.preventDefault();
    hideGMsg();
    if (!validateGeneral()) return;

    const correo  = gCorreo.value.trim();
    const celular = gCelular.value.trim();

    if (localRegistradoG('correo', correo)) {
      gCorreo.classList.add('error');
      showGMsg('Este correo ya tiene un registro previo.', 'error');
      return;
    }
    if (localRegistradoG('celular', celular)) {
      gCelular.classList.add('error');
      showGMsg('Este número ya tiene un registro previo.', 'error');
      return;
    }

    gSubmit.disabled   = true;
    gBtnText.hidden    = true;
    gBtnLoading.hidden = false;

    const dup = await servidorDuplicadoG(correo, celular);
    if (dup.correo) {
      gCorreo.classList.add('error');
      showGMsg('Este correo ya tiene un registro previo.', 'error');
      gSubmit.disabled = false; gBtnText.hidden = false; gBtnLoading.hidden = true;
      return;
    }
    if (dup.celular) {
      gCelular.classList.add('error');
      showGMsg('Este número ya tiene un registro previo.', 'error');
      gSubmit.disabled = false; gBtnText.hidden = false; gBtnLoading.hidden = true;
      return;
    }

    const alergiaRadio = formGeneral.querySelector('input[name="alergia"]:checked');
    const payload = {
      token:       TOKEN,
      tipo:        'registro-general',
      nombre:      gNombre.value.trim(),
      correo,
      celular,
      pais:        gPais.value,
      universidad: gUniversidad.value,
      puesto:      gPuesto.value.trim(),
      gafete:      gGafete.value.trim(),
      alergia:     alergiaRadio.value === 'Sí'
                     ? `Sí - ${gAlergiaDetalle.value.trim()}`
                     : 'No',
      facturacion: gFacturacion.value.trim() || 'N/A',
      fecha:       new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
    };

    try {
      await fetch(WEBHOOK_URL, {
        method:  'POST',
        mode:    'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body:    JSON.stringify(payload),
      });
    } catch { /* sin conexión */ } finally {
      gSubmit.disabled   = false;
      gBtnText.hidden    = false;
      gBtnLoading.hidden = true;
    }

    marcarRegistradoG(correo, celular);
    showGMsg('¡Registro exitoso! Nos pondremos en contacto contigo pronto.', 'success');
    formGeneral.reset();
    gAlergiaDetalleWrap.hidden = true;
    gAlergiaDetalle.required   = false;
    setTimeout(hideGMsg, 4000);
  });
})();

/* Inserción del botón "Registrarme" en cada detalle de sesión */
document.querySelectorAll('.sc-details').forEach(detail => {
  const card    = detail.closest('.session-card');
  const title   = card.querySelector('h3')?.textContent.trim() ?? '';
  const panel   = card.closest('.day-panel');
  const dayBtn  = document.querySelector(`.day-btn[data-day="${panel?.id?.replace('panel-', '')}"]`);
  const dayName = dayBtn?.querySelector('.day-name')?.textContent.trim() ?? '';

  const btn = document.createElement('button');
  btn.type      = 'button';
  btn.className = 'btn-register';
  btn.dataset.dia    = dayName;
  btn.dataset.sesion = title;
  btn.innerHTML = '&#9998; Registrarme';

  detail.appendChild(btn);

  btn.addEventListener('click', () => openModal(dayName, title));
});

/* Elementos del modal */
const modal       = document.getElementById('regModal');
const closeBtn    = document.getElementById('regClose');
const form        = document.getElementById('regForm');
const labelEl     = document.getElementById('regSessionLabel');
const diaInput    = document.getElementById('regDia');
const sesionInput = document.getElementById('regSesion');
const correoInput = document.getElementById('regCorreo');
const areaInput   = document.getElementById('regArea');
const submitBtn   = document.getElementById('regSubmit');
const btnText     = submitBtn.querySelector('.reg-btn-text');
const btnLoading  = submitBtn.querySelector('.reg-btn-loading');
const msgEl       = document.getElementById('regMsg');

function getModalidad() {
  const checked = form.querySelector('input[name="modalidad"]:checked');
  return checked ? checked.value : '';
}

/* Abrir / cerrar */
function openModal(dia, sesion) {
  diaInput.value    = dia;
  sesionInput.value = sesion;
  labelEl.textContent = `${dia} · ${sesion}`;
  correoInput.value = '';
  areaInput.value   = '';
  form.querySelectorAll('input[name="modalidad"]').forEach(r => r.checked = false);
  hideMsg();
  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  correoInput.focus();
}

function closeModal() {
  modal.setAttribute('hidden', '');
  document.body.style.overflow = '';
}

closeBtn.addEventListener('click', closeModal);

modal.addEventListener('click', e => {
  if (e.target === modal) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* Validación */
function validate() {
  let ok = true;

  correoInput.classList.remove('error');
  areaInput.classList.remove('error');

  const emailRe = /^[^\s@]+@anahuac\.mx$/i;
  if (!emailRe.test(correoInput.value.trim())) {
    correoInput.classList.add('error');
    showMsg('Solo se aceptan correos con dominio @anahuac.mx', 'error');
    ok = false;
  }

  if (!getModalidad()) {
    showMsg('Selecciona una modalidad (Presencial u Online).', 'error');
    ok = false;
  }

  if (!areaInput.value) {
    areaInput.classList.add('error');
    showMsg('Selecciona tu área.', 'error');
    ok = false;
  }

  return ok;
}

/* Funciones auxiliares de mensajes */
function showMsg(text, type) {
  msgEl.textContent = type === 'success'
    ? '✓ ' + text
    : '✗ ' + text;
  msgEl.className = `reg-msg ${type === 'success' ? 'success' : 'error-msg'}`;
  msgEl.removeAttribute('hidden');
}

function hideMsg() {
  msgEl.setAttribute('hidden', '');
  msgEl.className = 'reg-msg';
}

/* Control de registro duplicado */
function registrationKey(correo, sesion) {
  return `reg::${correo.toLowerCase().trim()}::${sesion}`;
}

function localAlreadyRegistered(correo, sesion) {
  return localStorage.getItem(registrationKey(correo, sesion)) === '1';
}

function markRegistered(correo, sesion) {
  localStorage.setItem(registrationKey(correo, sesion), '1');
}

async function serverAlreadyRegistered(correo, sesion) {
  try {
    const url = `${WEBHOOK_URL}?correo=${encodeURIComponent(correo)}&sesion=${encodeURIComponent(sesion)}`;
    const res  = await fetch(url);
    const data = await res.json();
    return data.registrado === true;
  } catch {
    return false;
  }
}

/* Envío del formulario */
form.addEventListener('submit', async e => {
  e.preventDefault();
  hideMsg();

  if (!validate()) return;

  const correo    = correoInput.value.trim();
  const sesion    = sesionInput.value;
  const modalidad = getModalidad();
  const area      = areaInput.value;

  if (localAlreadyRegistered(correo, sesion)) {
    correoInput.classList.add('error');
    showMsg('Este correo ya fue registrado para esta sesión.', 'error');
    return;
  }

  submitBtn.disabled = true;
  btnText.hidden     = true;
  btnLoading.hidden  = false;

  const duplicado = await serverAlreadyRegistered(correo, sesion);
  if (duplicado) {
    correoInput.classList.add('error');
    showMsg('Este correo ya fue registrado para esta sesión.', 'error');
    submitBtn.disabled = false;
    btnText.hidden     = false;
    btnLoading.hidden  = true;
    return;
  }

  const payload = {
    token:     TOKEN,
    correo,
    modalidad,
    area,
    dia:       diaInput.value,
    sesion,
    fecha:     new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
  };

  try {
    await fetch(WEBHOOK_URL, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify(payload),
    });
  } catch {
    /* solo falla si no hay internet */
  } finally {
    submitBtn.disabled = false;
    btnText.hidden     = false;
    btnLoading.hidden  = true;
  }

  markRegistered(correo, sesion);
  showMsg('¡Registro exitoso! Te esperamos en la sesión.', 'success');
  form.reset();
  setTimeout(closeModal, 2800);
});
