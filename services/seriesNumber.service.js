import { getDomRefs } from '../../../utils/system/dom-utils.js';

export const SeriesNumberFieldsHandler = () => {
    // --- ESTADO PRIVADO (Encapsulado) ---
    let dom = {};
    let currentRecord = null;

    const DOM_MAP = {
        selectType: 'Selecttype',
        inputCode: 'code',
        inputPostingSerie: 'postingSerie',
        inputDescription: 'description',
        inputFromDate: 'fromDate',
        inputToDate: 'toDate'
    };

    /**
     * Carga los tipos de numeración desde el diccionario SERIES_TYPES del backend
     */
    const loadTypes = async () => {
        if (!dom.selectType) return;

        try {
            const response = await window.bridge.invoke("api-request", {
                endpoint: "/seriesNumber/config/types",
                method: "GET"
            });

            if (response.success) {
                dom.selectType.innerHTML = '<option value="" disabled selected>Seleccione tipo...</option>';

                response.data.forEach(typeObj => {
                    const opt = document.createElement('option');
                    opt.value = typeObj.id;
                    opt.dataset.key = typeObj.key;
                    opt.textContent = typeObj.label.toUpperCase();
                    dom.selectType.appendChild(opt);
                });
            }
        } catch (error) {
            console.error("Error cargando el diccionario de series:", error);
        }
    };

    /**
     * Rellena el select de postingSerie basado en el tipo seleccionado
     */
    const refreshPostingSeries = async () => {
        if (!dom.inputPostingSerie || !dom.selectType) return;

        const selectedOption = dom.selectType.options[dom.selectType.selectedIndex];
        const typeKey = selectedOption?.dataset.key;

        if (!typeKey) return;

        try {
            const response = await window.bridge.invoke("api-request", {
                endpoint: `/seriesNumber/config/post-series/${typeKey}`,
                method: "GET"
            });

            if (response.success) {
                // Guardamos el valor actual para intentar restaurarlo tras la carga
                const currentValue = dom.inputPostingSerie.value;

                dom.inputPostingSerie.innerHTML = '<option value="">Sin vinculación...</option>';

                response.data.forEach(serie => {
                    const opt = document.createElement('option');
                    opt.value = serie.code;
                    opt.textContent = `${serie.code} - ${serie.description}`;
                    dom.inputPostingSerie.appendChild(opt);
                });

                // Restaurar valor si existía
                if (currentValue) dom.inputPostingSerie.value = currentValue;
            }
        } catch (error) {
            console.error("Error cargando series vinculadas:", error);
        }
    };

    /**
     * Valida los campos y gestiona los estados visuales de error
     */
    const validate = () => {
        let firstError = null;

        // 1. CAMPOS OBLIGATORIOS BASE
        const mandatoryFields = [
            { key: 'selectType', label: 'Tipo de numeración' },
            { key: 'inputCode', label: 'Código' },
            { key: 'inputDescription', label: 'Descripción' },
            { key: 'inputFromDate', label: 'Fecha desde' },
            { key: 'inputToDate', label: 'Fecha hasta' }
        ];

        // 2. LÓGICA DE OBLIGATORIEDAD CONDICIONAL PARA POSTINGSERIE
        const selectedOption = dom.selectType?.options[dom.selectType.selectedIndex];
        const typeKey = selectedOption?.dataset.key || '';

        const isPostingRequired = ['salesinvoice', 'purchinvoice'].includes(typeKey.toLowerCase());

        if (isPostingRequired) {
            mandatoryFields.push({ key: 'inputPostingSerie', label: 'Serie vinculada' });
        } else {
            // Limpieza proactiva si deja de ser obligatorio
            dom.inputPostingSerie?.classList.remove('is-invalid');
        }

        // Ejecución de validación de campos obligatorios
        mandatoryFields.forEach(field => {
            const el = dom[field.key];
            if (el) {
                const value = el.value?.toString().trim();
                if (!value) {
                    el.classList.add('is-invalid');
                    if (!firstError) firstError = `${field.label} es obligatorio`;
                } else {
                    el.classList.remove('is-invalid');
                }
            }
        });

        // 3. VALIDACIONES DE LÓGICA (Fechas)
        const fromVal = dom.inputFromDate?.value || '';
        const toVal = dom.inputToDate?.value || '';
        if (fromVal && toVal && fromVal > toVal) {
            dom.inputToDate.classList.add('is-invalid');
            if (!firstError) firstError = "La fecha final no puede ser anterior a la inicial";
        }

        return firstError;
    };

    // --- INTERFAZ PÚBLICA ---
    return {
        async init(record) {
            currentRecord = record;
            dom = getDomRefs(DOM_MAP);

            await loadTypes();

            // Listener para cambios en el tipo (carga series vinculadas y valida)
            dom.selectType?.addEventListener('change', async () => {
                await refreshPostingSeries();
                validate();
            });

            // Listeners de validación en tiempo real para el resto de campos
            const fieldsToMonitor = [
                'inputCode',
                'inputPostingSerie',
                'inputDescription',
                'inputFromDate',
                'inputToDate'
            ];

            fieldsToMonitor.forEach(key => {
                if (dom[key]) {
                    const eventType = dom[key].tagName === 'SELECT' ? 'change' : 'input';
                    dom[key].addEventListener(eventType, () => validate());
                }
            });
        },

        async fillData(data) {
            if (!data) return;

            // Primero cargamos el tipo
            if (dom.selectType) dom.selectType.value = data.type || '';

            // Refrescamos las opciones de postingSerie antes de asignar el valor
            await refreshPostingSeries();

            if (dom.inputCode) dom.inputCode.value = data.code || '';
            if (dom.inputPostingSerie) dom.inputPostingSerie.value = data.postingSerie || '';
            if (dom.inputDescription) dom.inputDescription.value = data.description || '';
            if (dom.inputFromDate) dom.inputFromDate.value = data.fromDate || '';
            if (dom.inputToDate) dom.inputToDate.value = data.toDate || '';

            // Limpiar estados de error
            Object.values(dom).forEach(el => el?.classList?.remove('is-invalid'));
        },

        getData(mode) {
            const error = validate();

            if (error) {
                console.warn("Validación fallida:", error);
            }

            const data = {
                type: dom.selectType?.value,
                code: dom.inputCode?.value.trim(),
                postingSerie: dom.inputPostingSerie?.value.trim(),
                description: dom.inputDescription?.value.trim(),
                fromDate: dom.inputFromDate?.value,
                toDate: dom.inputToDate?.value
            };

            console.log('Get Data>', data);
            return data;
        },

        validate
    };
};
