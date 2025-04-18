// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Загрузка начального контента
    loadTasks();

    // Обработчики кнопок навигации
    document.getElementById('all-btn').addEventListener('click', () => {
        setActiveButton('all-btn');
        loadTasks();
    });

    document.getElementById('active-btn').addEventListener('click', () => {
        setActiveButton('active-btn');
        loadTasks();
    });

    document.getElementById('completed-btn').addEventListener('click', () => {
        setActiveButton('completed-btn');
        loadTasks();
    });

    // Добавление новой задачи
    document.getElementById('add-task-btn').addEventListener('click', addTask);
    document.getElementById('new-task-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    // Управление уведомлениями
    document.getElementById('notifications-btn').addEventListener('click', toggleNotifications);

    // Регистрация Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('SW registered:', registration.scope);

                // Проверка состояния SW
                if (registration.installing) {
                    console.log('SW installing');
                } else if (registration.waiting) {
                    console.log('SW installed');
                } else if (registration.active) {
                    console.log('SW active');
                }
            } catch (error) {
                console.error('SW registration failed:', error);
            }
        });
    }
});


// Функция активации кнопки
function setActiveButton(buttonId) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(buttonId).classList.add('active');
}

// Работа с задачами
function loadTasks() {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    const activeFilter = document.querySelector('.nav-btn.active').id.replace('-btn', '');

    let filteredTasks = tasks;
    if (activeFilter === 'active') {
        filteredTasks = tasks.filter(task => !task.completed);
    } else if (activeFilter === 'completed') {
        filteredTasks = tasks.filter(task => task.completed);
    }

    const taskList = document.createElement('ul');
    taskList.className = 'task-list';

    filteredTasks.forEach((task, index) => {
        const taskItem = document.createElement('li');
        taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => toggleTaskComplete(index));

        const taskText = document.createElement('span');
        taskText.textContent = task.text;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Удалить';
        deleteBtn.addEventListener('click', () => deleteTask(index));

        taskItem.appendChild(checkbox);
        taskItem.appendChild(taskText);
        taskItem.appendChild(deleteBtn);
        taskList.appendChild(taskItem);
    });

    const contentDiv = document.getElementById('app-content');
    contentDiv.innerHTML = '';
    contentDiv.appendChild(taskList);
}

function addTask() {
    const input = document.getElementById('new-task-input');
    const text = input.value.trim();

    if (text) {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks.push({ text, completed: false });
        localStorage.setItem('tasks', JSON.stringify(tasks));

        input.value = '';
        loadTasks();

        // Отправка уведомления
        if (Notification.permission === 'granted') {
            sendNotification('Новая задача добавлена', text);
        }
    }
}

function toggleTaskComplete(index) {
    const tasks = JSON.parse(localStorage.getItem('tasks'));
    tasks[index].completed = !tasks[index].completed;
    localStorage.setItem('tasks', JSON.stringify(tasks));
    loadTasks();
}

function deleteTask(index) {
    const tasks = JSON.parse(localStorage.getItem('tasks'));
    tasks.splice(index, 1);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    loadTasks();
}

// Уведомления
function checkNotificationPermission() {
    if (Notification.permission === 'granted') {
        document.getElementById('notifications-btn').textContent = 'Уведомления включены';
    } else {
        document.getElementById('notifications-btn').textContent = 'Включить уведомления';
    }
}

async function toggleNotifications() {
    if (Notification.permission === 'granted') {
        // Отписка от уведомлений
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();
            await fetch('/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: subscription.endpoint })
            });
        }

        document.getElementById('notifications-btn').textContent = 'Включить уведомления';
    } else {
        // Подписка на уведомления
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array('BANyYYYp6Ne3cULh5y80E9NWuPXtTpwPUc3DJlISANezWTM-jkku8Ma29JbWveNJyy_bA_B3u_wSuOi2j1cyUtg')
            });

            await fetch('/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription)
            });

            document.getElementById('notifications-btn').textContent = 'Уведомления включены';

            // Напоминание о невыполненных задачах каждые 2 часа
            setInterval(checkUncompletedTasks, 2 * 60 * 60 * 1000);
        }
    }
    console.log(document.getElementById('notifications-btn'))
    checkNotificationPermission()
}

function checkUncompletedTasks() {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    const uncompleted = tasks.filter(task => !task.completed);

    if (uncompleted.length > 0) {
        sendNotification(
            'Незавершенные задачи',
            `У вас есть ${uncompleted.length} невыполненных задач`
        );
    }
}

function sendNotification(title, body) {
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, {
                body,
                icon: '/icons/icon-192.png',
                vibrate: [200, 100, 200]
            });
        });
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}