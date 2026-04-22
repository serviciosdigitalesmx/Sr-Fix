;(function (): void {
  type LandingCotizacionInput = SrFix.LandingCotizacionInput;
  type LandingSolicitudResponse = SrFix.LandingSolicitudResponse;

  const backend = window.SRFIXBackend as SrFix.BackendClient;
  const WHATSAPP = String(CONFIG.WHATSAPP || '').trim();

  const form = requireElement<HTMLFormElement>('cotizadorForm');
  const servicioInput = requireElement<HTMLInputElement>('servicioInput');
  const dispositivoSelect = requireElement<HTMLSelectElement>('dispositivoSelect');
  const urgenciaInput = requireElement<HTMLInputElement>('urgenciaInput');

  function requireElement<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Elemento no encontrado: ${id}`);
    return el as T;
  }

  function normalizarTelefono10(raw: unknown): string {
    const digits = String(raw || '').replace(/\D/g, '');
    return digits.length === 10 ? digits : '';
  }

  function getFieldValue(selector: string): string {
    const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    return String(el?.value || '').trim();
  }

  function getProblemasSeleccionados(): string[] {
    const problemas: string[] = [];
    document.querySelectorAll<HTMLInputElement>('input[name="problemas"]:checked').forEach((checkbox) => {
      const label = document.querySelector(`label[for="${checkbox.id}"]`);
      const value = label?.textContent?.trim() || checkbox.value;
      if (value) problemas.push(value);
    });
    return problemas;
  }

  function getServicioSeleccionado(): string {
    const selectedCard = document.querySelector('.service-card.selected') as HTMLElement | null;
    return dispositivoSelect.value || String(selectedCard?.dataset.servicio || '');
  }

  function getUrgenciaTexto(value: string): string {
    if (value === 'baja') return 'Baja (esta semana)';
    if (value === 'media') return 'Media (en 2-3 días)';
    return 'Alta (urgente, 24h)';
  }

  function setCopyright(): void {
    const copyright = document.querySelector('.copyright');
    if (!copyright) return;
    copyright.innerHTML = `© ${new Date().getFullYear()} SrFix Oficial. Todos los derechos reservados.<br>Especialistas en reparación de electrónicos en Monterrey, N.L.`;
  }

  function setupNavbar(): void {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.style.background = 'rgba(30, 30, 30, 0.98)';
        navbar.style.padding = '0.8rem 5%';
      } else {
        navbar.style.background = 'rgba(30, 30, 30, 0.95)';
        navbar.style.padding = '1rem 5%';
      }
    });
  }

  function setupFadeInObserver(): void {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.fade-in').forEach((el) => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));
  }

  function setupServiceCards(): void {
    document.querySelectorAll('.service-card').forEach((card) => {
      card.addEventListener('click', function (this: HTMLElement) {
        document.querySelectorAll('.service-card').forEach((item) => item.classList.remove('selected'));
        this.classList.add('selected');
        const servicio = String(this.dataset.servicio || '');
        servicioInput.value = servicio;
        if (Array.from(dispositivoSelect.options).some((option) => option.value === servicio)) {
          dispositivoSelect.value = servicio;
        }
        document.querySelector('.form-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  function setupUrgenciaButtons(): void {
    document.querySelectorAll('.urgencia-btn').forEach((button) => {
      button.addEventListener('click', function (this: HTMLElement) {
        document.querySelectorAll('.urgencia-btn').forEach((item) => item.classList.remove('active'));
        this.classList.add('active');
        urgenciaInput.value = String(this.dataset.value || 'alta');
      });
    });
  }

  async function capturePublicIp(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json() as { ip?: string };
      return String(data.ip || '0.0.0.0');
    } catch {
      return '0.0.0.0';
    }
  }

  async function requestCrearSolicitud(payload: LandingCotizacionInput): Promise<LandingSolicitudResponse> {
    try {
      return await backend.request<LandingSolicitudResponse>('crear_solicitud', payload, { method: 'POST' });
    } catch {
      return await backend.request<LandingSolicitudResponse>('crear_solicitud', payload, { method: 'GET' });
    }
  }

  function resetFormState(): void {
    form.reset();
    document.querySelectorAll('.service-card').forEach((item) => item.classList.remove('selected'));
    const urgenciaAlta = document.querySelector('.urgencia-btn[data-value="alta"]') as HTMLElement | null;
    urgenciaAlta?.click();
    servicioInput.value = '';
  }

  async function onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const originalLabel = submitButton?.innerHTML || '';

    try {
      const dispositivo = getServicioSeleccionado();
      if (!dispositivo) {
        alert('Por favor selecciona un tipo de servicio.');
        return;
      }

      const nombre = getFieldValue('input[name="nombre"]');
      const telefono = normalizarTelefono10(getFieldValue('input[name="telefono"]'));
      const modelo = getFieldValue('input[name="modelo"]');
      const descripcion = getFieldValue('textarea[name="descripcion"]');
      const email = getFieldValue('input[name="email"]');
      const urgencia = String(urgenciaInput.value || 'alta');

      if (!telefono) {
        alert('El teléfono debe tener exactamente 10 dígitos.');
        return;
      }

      if (!WHATSAPP) {
        throw new Error('CONFIG.WHATSAPP no está definido');
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
      }

      const payload: LandingCotizacionInput = {
        nombre,
        telefono,
        email,
        dispositivo,
        modelo,
        problemas: getProblemasSeleccionados(),
        descripcion,
        urgencia: urgencia as LandingCotizacionInput['urgencia'],
        solicitud_origen_ip: await capturePublicIp()
      };

      const result = await requestCrearSolicitud(payload);
      const folio = String(result.folio || 'N/A');
      const mensaje = [
        '*Nueva cotización - SrFix Oficial*',
        '',
        `*Folio:* ${folio}`,
        `*Nombre:* ${nombre || 'No especificado'}`,
        `*Teléfono:* ${telefono || 'No especificado'}`,
        `*Email:* ${email || 'No especificado'}`,
        `*Dispositivo:* ${dispositivo}`,
        `*Modelo:* ${modelo || 'No especificado'}`,
        `*Problemas:* ${payload.problemas.length ? payload.problemas.join(', ') : 'No especificados'}`,
        `*Descripción:* ${descripcion || 'Sin descripción'}`,
        `*Urgencia:* ${getUrgenciaTexto(urgencia)}`
      ].join('\n');

      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`, '_blank');
      resetFormState();
      alert(`Solicitud guardada con folio ${folio}. Redirigiendo a WhatsApp...`);
    } catch (error) {
      console.error('Error al enviar cotización:', error);
      alert(error instanceof Error ? error.message : 'No se pudo guardar la solicitud. Revisa tu conexión e intenta de nuevo.');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = originalLabel;
      }
    }
  }

  function bootstrap(): void {
    setupNavbar();
    setupFadeInObserver();
    setupServiceCards();
    setupUrgenciaButtons();
    setCopyright();
    form.addEventListener('submit', (event) => { void onSubmit(event); });
  }

  bootstrap();
})();
