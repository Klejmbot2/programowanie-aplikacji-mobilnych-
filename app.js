// Aplikacja ToDo - Główna logika aplikacji

// Model danych dla zadania
class Task {
    constructor(title, description = '', assignee = '', client = '', priority = 'medium', deadline = '', category = '') {
        this.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
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
        M.Datepicker.init(document.querySelectorAll('.datepicker'), datePickerOptions);
        
        // Select dropdown
        M.FormSelect.init(document.querySelectorAll('select'));
        
        // Modal
        M.Modal.init(document.querySelectorAll('.modal'));
        
        // Toast notifications
        if (typeof M.toast !== 'undefined') {
            // Materialize toast jest dostępny
        }
    },

    // Obsługa zdarzeń
    setupEventListeners() {
        // Formularz dodawania zadania
        const taskForm = document.getElementById('task-form');
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddTask();
        });

        // Przycisk anulowania edycji
        document.getElementById('cancel-edit').addEventListener('click', () => {
            this.cancelEdit();
        });

        // Filtry
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.getAttribute('data-filter');
                this.setFilter(filter);
            });
        });

        // Wyszukiwarka
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderTasks();
        });

        // Zapisywanie edycji w modalu
        document.getElementById('save-edit').addEventListener('click', () => {
            this.handleSaveEdit();
        });

        // Dark mode toggle
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', (e) => {
                this.toggleDarkMode(e.target.checked);
            });
        }
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
        document.getElementById('task-form').reset();
        document.getElementById('cancel-edit').style.display = 'none';
        this.editingTaskId = null;
        M.FormSelect.init(document.querySelectorAll('select'));
        M.updateTextFields();
    },

    // Usuwanie zadania
    deleteTask(taskId) {
        if (confirm('Czy na pewno chcesz usunąć to zadanie?')) {
            this.tasks = this.tasks.filter(task => task.id !== taskId);
            this.saveTasks();
            this.renderTasks();
            this.updateTaskCounter();
            this.showToast('Zadanie zostało usunięte!', 'success');
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

    // Rozpoczęcie edycji zadania
    startEdit(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.editingTaskId = taskId;
        
        // Wypełnienie głównego formularza
        const titleEl = document.getElementById('task-title');
        const descEl = document.getElementById('task-description');
        const assigneeEl = document.getElementById('task-assignee');
        const clientEl = document.getElementById('task-client');
        const priorityEl = document.getElementById('task-priority');
        const deadlineEl = document.getElementById('task-deadline');
        const categoryEl = document.getElementById('task-category');
        
        if (titleEl) titleEl.value = task.title;
        if (descEl) descEl.value = task.description || '';
        if (assigneeEl) assigneeEl.value = task.assignee || '';
        if (clientEl) clientEl.value = task.client || '';
        if (priorityEl) priorityEl.value = task.priority;
        if (deadlineEl) deadlineEl.value = task.deadline || '';
        if (categoryEl) categoryEl.value = task.category || '';

        // Wypełnienie modala edycji (jeśli istnieje)
        const editTitleEl = document.getElementById('edit-title');
        const editDescEl = document.getElementById('edit-description');
        const editAssigneeEl = document.getElementById('edit-assignee');
        const editClientEl = document.getElementById('edit-client');
        const editPriorityEl = document.getElementById('edit-priority');
        const editDeadlineEl = document.getElementById('edit-deadline');
        const editCategoryEl = document.getElementById('edit-category');
        
        if (editTitleEl) editTitleEl.value = task.title;
        if (editDescEl) editDescEl.value = task.description || '';
        if (editAssigneeEl) editAssigneeEl.value = task.assignee || '';
        if (editClientEl) editClientEl.value = task.client || '';
        if (editPriorityEl) editPriorityEl.value = task.priority;
        if (editDeadlineEl) editDeadlineEl.value = task.deadline || '';
        if (editCategoryEl) editCategoryEl.value = task.category || '';

        // Aktualizacja Materialize
        M.FormSelect.init(document.querySelectorAll('select'));
        M.updateTextFields();
        
        // Inicjalizacja date picker dla edycji
        if (deadlineEl && task.deadline) {
            deadlineEl.value = task.deadline;
        }
        if (editDeadlineEl && task.deadline) {
            editDeadlineEl.value = task.deadline;
        }

        // Pokazanie przycisku anulowania
        const cancelBtn = document.getElementById('cancel-edit');
        if (cancelBtn) {
            cancelBtn.style.display = 'inline-block';
        }
        
        // Otwarcie modala edycji jeśli istnieje
        const modalEl = document.getElementById('edit-modal');
        if (modalEl) {
            const modal = M.Modal.getInstance(modalEl);
            if (modal) {
                modal.open();
            } else {
                const newModal = M.Modal.init(modalEl);
                newModal.open();
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

        task.title = title;
        task.description = descEl ? descEl.value.trim() : '';
        task.assignee = assigneeEl ? assigneeEl.value.trim() : '';
        task.client = clientEl ? clientEl.value.trim() : '';
        task.priority = priorityEl ? priorityEl.value : 'medium';
        task.deadline = deadlineEl ? deadlineEl.value : '';
        task.category = categoryEl ? categoryEl.value.trim() : '';
        task.updatedAt = new Date().toISOString();

        this.saveTasks();
        this.renderTasks();
        this.resetForm();
        
        // Zamknięcie modala jeśli istnieje
        const modal = M.Modal.getInstance(document.getElementById('edit-modal'));
        if (modal) {
            modal.close();
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

    // Filtrowanie zadań
    getFilteredTasks() {
        let filtered = this.tasks;

        // Filtrowanie po statusie
        if (this.currentFilter === 'active') {
            filtered = filtered.filter(task => !task.completed);
        } else if (this.currentFilter === 'completed') {
            filtered = filtered.filter(task => task.completed);
        }

        // Wyszukiwanie
        if (this.searchQuery) {
            filtered = filtered.filter(task => {
                const searchLower = this.searchQuery.toLowerCase();
                return task.title.toLowerCase().includes(searchLower) ||
                       task.description.toLowerCase().includes(searchLower) ||
                       task.assignee.toLowerCase().includes(searchLower) ||
                       (task.client && task.client.toLowerCase().includes(searchLower)) ||
                       task.category.toLowerCase().includes(searchLower);
            });
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
        
        // Dodanie event listenerów do przycisków
        filteredTasks.forEach(task => {
            // Checkbox statusu
            const checkbox = document.querySelector(`#task-${task.id}`);
            if (checkbox) {
                checkbox.addEventListener('change', () => this.toggleTaskStatus(task.id));
            }

            // Przycisk edycji
            const editBtn = document.querySelector(`#edit-${task.id}`);
            if (editBtn) {
                editBtn.addEventListener('click', () => this.startEdit(task.id));
            }

            // Przycisk usuwania
            const deleteBtn = document.querySelector(`#delete-${task.id}`);
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.deleteTask(task.id));
            }
        });
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
                                        <strong>Wykonawca:</strong> ${task.assignee || 'Nie przypisano'}
                                    </p>
                                    <p class="task-info">
                                        <i class="material-icons tiny">person_outline</i>
                                        <strong>Zleceniodawca:</strong> ${task.client || 'Nie przypisano'}
                                    </p>
                                    <p class="task-info">
                                        <i class="material-icons tiny">event</i>
                                        <strong>Deadline:</strong> ${deadlineDisplay}
                                    </p>
                                </div>
                                <div class="col s12 m6">
                                    <p class="task-info">
                                        <i class="material-icons tiny">label</i>
                                        <strong>Kategoria:</strong> ${task.category || 'Brak'}
                                    </p>
                                    <p class="task-info">
                                        <i class="material-icons tiny">schedule</i>
                                        <strong>Utworzono:</strong> ${createdAtDisplay}
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
            localStorage.setItem('todoTasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.error('Błąd zapisywania do localStorage:', error);
            this.showToast('Błąd zapisywania danych!', 'error');
        }
    },

    // Ładowanie zadań z localStorage
    loadTasks() {
        try {
            const savedTasks = localStorage.getItem('todoTasks');
            if (savedTasks) {
                this.tasks = JSON.parse(savedTasks);
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

