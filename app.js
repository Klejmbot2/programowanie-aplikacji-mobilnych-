// Aplikacja ToDo - Główna logika aplikacji

// Model danych dla zadania
class Task {
    constructor(title, description = '', assignee = '', client = '', priority = 'medium', deadline = '', category = '') {
        this.id = Date.now().toString() + Math.random().toString(36).substring(2, 11);
        this.title = title;
        this.description = description;
        this.assignee = assignee;
        this.client = client;
        this.priority = priority;
        this.deadline = deadline;
        this.category = category;
        this.completed = false;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }
}

// Główny obiekt aplikacji
const TodoApp = {
    tasks: [],
    currentFilter: 'all',
    searchQuery: '',
    editingTaskId: null,

    // Inicjalizacja aplikacji
    init() {
        this.loadTasks();
        this.loadDarkMode();
        this.setupEventListeners();
        this.initMaterialize();
        this.renderTasks();
        this.updateTaskCounter();
    },

    // Inicjalizacja komponentów Materialize
    initMaterialize() {
        try {
            // Sprawdzenie dostępności Materialize
            if (typeof M === 'undefined') {
                console.warn('Materialize CSS nie został załadowany');
                return;
            }

            // Date picker
            const datePickerOptions = {
                format: 'yyyy-mm-dd',
                autoClose: true,
                i18n: {
                    months: ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'],
                    monthsShort: ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'],
                    weekdays: ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'],
                    weekdaysShort: ['Nie', 'Pon', 'Wto', 'Śro', 'Czw', 'Pią', 'Sob'],
                    today: 'Dzisiaj',
                    clear: 'Wyczyść',
                    cancel: 'Anuluj',
                    done: 'OK'
                }
            };
            
            const datePickers = document.querySelectorAll('.datepicker');
            if (datePickers.length > 0 && M.Datepicker) {
                M.Datepicker.init(datePickers, datePickerOptions);
            }
            
            // Select dropdown
            const selects = document.querySelectorAll('select');
            if (selects.length > 0 && M.FormSelect) {
                M.FormSelect.init(selects);
            }
            
            // Modal
            const modals = document.querySelectorAll('.modal');
            if (modals.length > 0 && M.Modal) {
                M.Modal.init(modals);
            }
        } catch (error) {
            console.error('Błąd inicjalizacji Materialize:', error);
        }
    },

    // Debounce function dla wyszukiwarki
    debounceTimer: null,
    debounce(func, wait) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(func, wait);
    },

    // Obsługa zdarzeń
    setupEventListeners() {
        // Formularz dodawania zadania
        const taskForm = document.getElementById('task-form');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddTask();
            });
        }

        // Przycisk anulowania edycji
        const cancelEditBtn = document.getElementById('cancel-edit');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                this.cancelEdit();
            });
        }

        // Filtry - event delegation
        const filterContainer = document.querySelector('.filter-buttons');
        if (filterContainer) {
            filterContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.filter-btn');
                if (btn) {
                    const filter = btn.getAttribute('data-filter');
                    if (filter) {
                        this.setFilter(filter);
                    }
                }
            });
        }

        // Wyszukiwarka z debounce
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.debounce(() => {
                    this.searchQuery = e.target.value.toLowerCase();
                    this.renderTasks();
                }, 300);
            });
        }

        // Zapisywanie edycji w modalu
        const saveEditBtn = document.getElementById('save-edit');
        if (saveEditBtn) {
            saveEditBtn.addEventListener('click', () => {
                this.handleSaveEdit();
            });
        }

        // Dark mode toggle
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', (e) => {
                this.toggleDarkMode(e.target.checked);
            });
        }

        // Event delegation dla zadań (checkbox, edycja, usuwanie)
        const tasksContainer = document.getElementById('tasks-container');
        if (tasksContainer) {
            tasksContainer.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox' && e.target.id.startsWith('task-')) {
                    const taskId = e.target.id.replace('task-', '');
                    this.toggleTaskStatus(taskId);
                }
            });

            tasksContainer.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target) return;

                if (target.id.startsWith('edit-')) {
                    const taskId = target.id.replace('edit-', '');
                    this.startEdit(taskId);
                } else if (target.id.startsWith('delete-')) {
                    const taskId = target.id.replace('delete-', '');
                    this.deleteTask(taskId);
                }
            });
        }
    },

    // Walidacja daty deadline
    validateDeadline(deadline) {
        if (!deadline) return true; // Deadline jest opcjonalny
        const deadlineDate = new Date(deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        deadlineDate.setHours(0, 0, 0, 0);
        return deadlineDate >= today;
    },

    // Dodawanie nowego zadania
    handleAddTask() {
        const title = document.getElementById('task-title').value.trim();
        if (!title) {
            this.showToast('Tytuł zadania jest wymagany!', 'error');
            return;
        }

        const description = document.getElementById('task-description').value.trim();
        const assignee = document.getElementById('task-assignee').value.trim();
        const client = document.getElementById('task-client').value.trim();
        const priority = document.getElementById('task-priority').value;
        const deadline = document.getElementById('task-deadline').value;
        const category = document.getElementById('task-category').value.trim();

        // Walidacja daty deadline
        if (deadline && !this.validateDeadline(deadline)) {
            this.showToast('Data deadline nie może być w przeszłości!', 'error');
            return;
        }

        const task = new Task(title, description, assignee, client, priority, deadline, category);
        this.tasks.push(task);
        this.saveTasks();
        this.renderTasks();
        this.updateTaskCounter();
        this.resetForm();
        this.showToast('Zadanie zostało dodane!', 'success');
    },

    // Reset formularza
    resetForm() {
        const taskForm = document.getElementById('task-form');
        if (taskForm) {
            taskForm.reset();
        }
        const cancelEditBtn = document.getElementById('cancel-edit');
        if (cancelEditBtn) {
            cancelEditBtn.style.display = 'none';
        }
        this.editingTaskId = null;
        
        // Reinicjalizacja Materialize
        if (typeof M !== 'undefined' && M.FormSelect) {
            try {
                M.FormSelect.init(document.querySelectorAll('select'));
                if (M.updateTextFields) {
                    M.updateTextFields();
                }
            } catch (error) {
                console.error('Błąd reinicjalizacji formularza:', error);
            }
        }
    },

    // Usuwanie zadania
    deleteTask(taskId) {
        // Tworzenie modala potwierdzenia
        const confirmModal = document.getElementById('confirm-delete-modal');
        if (confirmModal) {
            const modal = M.Modal.getInstance(confirmModal) || M.Modal.init(confirmModal);
            const confirmBtn = document.getElementById('confirm-delete-btn');
            
            // Usunięcie poprzedniego listenera jeśli istnieje
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            
            newConfirmBtn.addEventListener('click', () => {
                this.tasks = this.tasks.filter(task => task.id !== taskId);
                this.saveTasks();
                this.renderTasks();
                this.updateTaskCounter();
                this.showToast('Zadanie zostało usunięte!', 'success');
                modal.close();
            });
            
            modal.open();
        } else {
            // Fallback do confirm jeśli modal nie istnieje
            if (confirm('Czy na pewno chcesz usunąć to zadanie?')) {
                this.tasks = this.tasks.filter(task => task.id !== taskId);
                this.saveTasks();
                this.renderTasks();
                this.updateTaskCounter();
                this.showToast('Zadanie zostało usunięte!', 'success');
            }
        }
    },

    // Przełączanie statusu zadania (zakończone/aktywne)
    toggleTaskStatus(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.updatedAt = new Date().toISOString();
            this.saveTasks();
            this.renderTasks();
            this.updateTaskCounter();
            const status = task.completed ? 'zakończone' : 'przywrócone';
            this.showToast(`Zadanie zostało ${status}!`, 'success');
        }
    },

    // Wypełnienie formularza danymi zadania (wyodrębniona funkcja)
    fillFormWithTaskData(task, formPrefix = 'task') {
        const fields = ['title', 'description', 'assignee', 'client', 'priority', 'deadline', 'category'];
        fields.forEach(field => {
            const el = document.getElementById(`${formPrefix}-${field}`);
            if (el) {
                if (field === 'priority') {
                    el.value = task[field] || 'medium';
                } else {
                    el.value = task[field] || '';
                }
            }
        });

        // Aktualizacja Materialize
        if (typeof M !== 'undefined' && M.FormSelect) {
            try {
                M.FormSelect.init(document.querySelectorAll('select'));
                if (M.updateTextFields) {
                    M.updateTextFields();
                }
            } catch (error) {
                console.error('Błąd aktualizacji formularza:', error);
            }
        }
    },

    // Rozpoczęcie edycji zadania
    startEdit(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.editingTaskId = taskId;
        
        // Wypełnienie głównego formularza
        this.fillFormWithTaskData(task, 'task');

        // Wypełnienie modala edycji (jeśli istnieje)
        this.fillFormWithTaskData(task, 'edit');

        // Pokazanie przycisku anulowania
        const cancelBtn = document.getElementById('cancel-edit');
        if (cancelBtn) {
            cancelBtn.style.display = 'inline-block';
        }
        
        // Otwarcie modala edycji jeśli istnieje
        const modalEl = document.getElementById('edit-modal');
        if (modalEl && typeof M !== 'undefined' && M.Modal) {
            try {
                const modal = M.Modal.getInstance(modalEl);
                if (modal) {
                    modal.open();
                } else {
                    const newModal = M.Modal.init(modalEl);
                    newModal.open();
                }
            } catch (error) {
                console.error('Błąd otwierania modala:', error);
            }
        } else {
            // Przewinięcie do formularza jeśli nie ma modala
            const taskForm = document.getElementById('task-form');
            if (taskForm) {
                taskForm.scrollIntoView({ behavior: 'smooth' });
            }
        }
    },

    // Zapisywanie edycji zadania
    handleSaveEdit() {
        if (!this.editingTaskId) return;

        const task = this.tasks.find(t => t.id === this.editingTaskId);
        if (!task) return;

        // Użycie pól z modala edycji lub głównego formularza
        const titleEl = document.getElementById('edit-title') || document.getElementById('task-title');
        const title = titleEl ? titleEl.value.trim() : '';
        
        if (!title) {
            this.showToast('Tytuł zadania jest wymagany!', 'error');
            return;
        }

        // Aktualizacja zadania - sprawdzenie czy są pola z modala
        const descEl = document.getElementById('edit-description') || document.getElementById('task-description');
        const assigneeEl = document.getElementById('edit-assignee') || document.getElementById('task-assignee');
        const clientEl = document.getElementById('edit-client') || document.getElementById('task-client');
        const priorityEl = document.getElementById('edit-priority') || document.getElementById('task-priority');
        const deadlineEl = document.getElementById('edit-deadline') || document.getElementById('task-deadline');
        const categoryEl = document.getElementById('edit-category') || document.getElementById('task-category');

        const deadline = deadlineEl ? deadlineEl.value : '';
        
        // Walidacja daty deadline
        if (deadline && !this.validateDeadline(deadline)) {
            this.showToast('Data deadline nie może być w przeszłości!', 'error');
            return;
        }

        task.title = title;
        task.description = descEl ? descEl.value.trim() : '';
        task.assignee = assigneeEl ? assigneeEl.value.trim() : '';
        task.client = clientEl ? clientEl.value.trim() : '';
        task.priority = priorityEl ? priorityEl.value : 'medium';
        task.deadline = deadline;
        task.category = categoryEl ? categoryEl.value.trim() : '';
        task.updatedAt = new Date().toISOString();

        this.saveTasks();
        this.renderTasks();
        this.resetForm();
        
        // Zamknięcie modala jeśli istnieje
        const modalEl = document.getElementById('edit-modal');
        if (modalEl && typeof M !== 'undefined' && M.Modal) {
            try {
                const modal = M.Modal.getInstance(modalEl);
                if (modal) {
                    modal.close();
                }
            } catch (error) {
                console.error('Błąd zamykania modala:', error);
            }
        }
        
        this.showToast('Zadanie zostało zaktualizowane!', 'success');
    },

    // Anulowanie edycji
    cancelEdit() {
        this.resetForm();
        this.showToast('Edycja anulowana', 'info');
    },

    // Ustawienie filtra
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Aktualizacja przycisków filtrów
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-filter') === filter) {
                btn.classList.add('active');
            }
        });

        this.renderTasks();
    },

    // Cache dla posortowanych zadań
    sortedTasksCache: null,
    lastSortKey: null,

    // Filtrowanie zadań
    getFilteredTasks() {
        let filtered = this.tasks;

        // Filtrowanie po statusie
        if (this.currentFilter === 'active') {
            filtered = filtered.filter(task => !task.completed);
        } else if (this.currentFilter === 'completed') {
            filtered = filtered.filter(task => task.completed);
        }

        // Wyszukiwanie z obsługą null/undefined
        if (this.searchQuery) {
            filtered = filtered.filter(task => {
                const searchLower = this.searchQuery.toLowerCase();
                const safeString = (str) => (str || '').toLowerCase();
                return safeString(task.title).includes(searchLower) ||
                       safeString(task.description).includes(searchLower) ||
                       safeString(task.assignee).includes(searchLower) ||
                       safeString(task.client).includes(searchLower) ||
                       safeString(task.category).includes(searchLower);
            });
        }

        // Tworzenie klucza cache
        const sortKey = `${this.currentFilter}-${this.searchQuery}-${this.tasks.length}`;
        
        // Sprawdzenie czy można użyć cache
        if (this.sortedTasksCache && this.lastSortKey === sortKey) {
            return this.sortedTasksCache;
        }

        // Sortowanie: najpierw aktywne, potem zakończone, potem po priorytecie i dacie
        filtered.sort((a, b) => {
            // Najpierw aktywne przed zakończonymi
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            
            // Priorytet (high > medium > low)
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            
            // Data utworzenia (nowsze pierwsze)
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Zapisanie do cache
        this.sortedTasksCache = filtered;
        this.lastSortKey = sortKey;

        return filtered;
    },

    // Renderowanie zadań
    renderTasks() {
        const container = document.getElementById('tasks-container');
        const filteredTasks = this.getFilteredTasks();

        if (filteredTasks.length === 0) {
            const message = this.searchQuery 
                ? 'Brak zadań pasujących do wyszukiwania.' 
                : this.currentFilter === 'active' 
                    ? 'Brak aktywnych zadań.' 
                    : this.currentFilter === 'completed' 
                        ? 'Brak zakończonych zadań.' 
                        : 'Brak zadań. Dodaj pierwsze zadanie!';
            
            container.innerHTML = `
                <div class="card">
                    <div class="card-content center-align">
                        <p class="grey-text">${message}</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredTasks.map(task => this.renderTask(task)).join('');
        
        // Event delegation jest już skonfigurowane w setupEventListeners
        // Nie trzeba dodawać listenerów dla każdego zadania osobno
    },

    // Renderowanie pojedynczego zadania
    renderTask(task) {
        const isOverdue = task.deadline && !task.completed && new Date(task.deadline) < new Date();
        const priorityClass = `priority-${task.priority}`;
        const priorityLabels = { low: 'Niski', medium: 'Średni', high: 'Wysoki' };
        const priorityColors = { low: 'green', medium: 'orange', high: 'red' };

        const deadlineDisplay = task.deadline 
            ? new Date(task.deadline).toLocaleDateString('pl-PL')
            : 'Brak';

        const createdAtDisplay = new Date(task.createdAt).toLocaleDateString('pl-PL');

        return `
            <div class="card task-card ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''} ${priorityClass}" data-task-id="${task.id}">
                <div class="card-content">
                    <div class="row valign-wrapper">
                        <div class="col s1">
                            <label>
                                <input type="checkbox" id="task-${task.id}" ${task.completed ? 'checked' : ''} />
                                <span></span>
                            </label>
                        </div>
                        <div class="col s11">
                            <div class="row">
                                <div class="col s12 m8">
                                    <h5 class="${task.completed ? 'strikethrough' : ''}">${this.escapeHtml(task.title)}</h5>
                                    ${task.description ? `<p class="${task.completed ? 'strikethrough grey-text' : ''}">${this.escapeHtml(task.description)}</p>` : ''}
                                </div>
                                <div class="col s12 m4 right-align">
                                    <span class="badge ${priorityColors[task.priority]} white-text">${priorityLabels[task.priority]}</span>
                                    ${isOverdue && !task.completed ? '<span class="badge red white-text">Przeterminowane</span>' : ''}
                                </div>
                            </div>
                            <div class="row task-meta">
                                <div class="col s12 m6">
                                    <p class="task-info">
                                        <i class="material-icons tiny">person</i>
                                        <strong>Wykonawca:</strong> ${this.escapeHtml(task.assignee || 'Nie przypisano')}
                                    </p>
                                    <p class="task-info">
                                        <i class="material-icons tiny">person_outline</i>
                                        <strong>Zleceniodawca:</strong> ${this.escapeHtml(task.client || 'Nie przypisano')}
                                    </p>
                                    <p class="task-info">
                                        <i class="material-icons tiny">event</i>
                                        <strong>Deadline:</strong> ${this.escapeHtml(deadlineDisplay)}
                                    </p>
                                </div>
                                <div class="col s12 m6">
                                    <p class="task-info">
                                        <i class="material-icons tiny">label</i>
                                        <strong>Kategoria:</strong> ${this.escapeHtml(task.category || 'Brak')}
                                    </p>
                                    <p class="task-info">
                                        <i class="material-icons tiny">schedule</i>
                                        <strong>Utworzono:</strong> ${this.escapeHtml(createdAtDisplay)}
                                    </p>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col s12 right-align">
                                    <button class="btn-small waves-effect waves-light blue darken-2" id="edit-${task.id}">
                                        <i class="material-icons left">edit</i>Edytuj
                                    </button>
                                    <button class="btn-small waves-effect waves-light red" id="delete-${task.id}">
                                        <i class="material-icons left">delete</i>Usuń
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Escape HTML (zabezpieczenie przed XSS)
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Aktualizacja licznika zadań
    updateTaskCounter() {
        const activeCount = this.tasks.filter(task => !task.completed).length;
        const activeCountEl = document.getElementById('active-count');
        const activeCountMobileEl = document.getElementById('active-count-mobile');
        
        if (activeCountEl) {
            activeCountEl.textContent = activeCount;
        }
        if (activeCountMobileEl) {
            activeCountMobileEl.textContent = activeCount;
        }
    },

    // Zapisywanie zadań do localStorage
    saveTasks() {
        try {
            // Inwalidacja cache przy zapisie
            this.sortedTasksCache = null;
            this.lastSortKey = null;
            
            localStorage.setItem('todoTasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.error('Błąd zapisywania do localStorage:', error);
            this.showToast('Błąd zapisywania danych!', 'error');
        }
    },

    // Walidacja struktury zadania
    validateTaskStructure(task) {
        return task &&
               typeof task === 'object' &&
               typeof task.id === 'string' &&
               typeof task.title === 'string' &&
               typeof task.completed === 'boolean' &&
               (task.priority === 'low' || task.priority === 'medium' || task.priority === 'high');
    },

    // Ładowanie zadań z localStorage
    loadTasks() {
        try {
            const savedTasks = localStorage.getItem('todoTasks');
            if (savedTasks) {
                const parsed = JSON.parse(savedTasks);
                
                // Walidacja struktury danych
                if (Array.isArray(parsed)) {
                    // Filtrowanie tylko poprawnych zadań
                    this.tasks = parsed.filter(task => this.validateTaskStructure(task));
                    
                    // Jeśli po walidacji lista jest pusta, ale były dane, oznacza to błąd
                    if (parsed.length > 0 && this.tasks.length === 0) {
                        console.warn('Wszystkie zadania z localStorage były nieprawidłowe');
                        this.showToast('Dane w pamięci były uszkodzone. Zainicjalizowano pustą listę.', 'warning');
                    }
                } else {
                    console.warn('Dane w localStorage nie są tablicą');
                    this.tasks = [];
                }
            }
        } catch (error) {
            console.error('Błąd ładowania z localStorage:', error);
            this.showToast('Błąd ładowania danych!', 'error');
            this.tasks = [];
        }
    },

    // Wyświetlanie powiadomień (toast)
    showToast(message, type = 'info') {
        const colors = {
            success: 'green',
            error: 'red',
            info: 'blue',
            warning: 'orange'
        };

        const color = colors[type] || 'blue';
        
        // Użycie Materialize toast jeśli dostępne
        if (typeof M !== 'undefined' && M.toast) {
            M.toast({
                html: message,
                classes: color,
                displayLength: 3000
            });
        } else {
            // Fallback - prosty alert
            alert(message);
        }
    },

    // Ładowanie stanu dark mode z localStorage
    loadDarkMode() {
        try {
            const darkMode = localStorage.getItem('darkMode') === 'true';
            const toggle = document.getElementById('dark-mode-toggle');
            if (toggle) {
                toggle.checked = darkMode;
            }
            this.applyDarkMode(darkMode);
        } catch (error) {
            console.error('Błąd ładowania dark mode:', error);
        }
    },

    // Przełączanie dark mode
    toggleDarkMode(enabled) {
        this.applyDarkMode(enabled);
        try {
            localStorage.setItem('darkMode', enabled.toString());
        } catch (error) {
            console.error('Błąd zapisywania dark mode:', error);
        }
    },

    // Zastosowanie dark mode
    applyDarkMode(enabled) {
        const body = document.body;
        if (enabled) {
            body.classList.add('dark-mode');
        } else {
            body.classList.remove('dark-mode');
        }
    }
};

// Inicjalizacja aplikacji po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
    TodoApp.init();
});

