// Состояние приложения
let slides = [];
let currentSlideIndex = 0;
let selectedElement = null;
let elementIdCounter = 0;
let activeEditable = null;
let activeCropSession = null;

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    createNewSlide();
});

function initializeApp() {
    // Создаем первый слайд
    slides = [];
    currentSlideIndex = 0;
}

function setupEventListeners() {
    // Кнопки управления слайдами
    document.getElementById('addSlideBtn').addEventListener('click', createNewSlide);
    document.getElementById('prevSlideBtn').addEventListener('click', () => changeSlide(-1));
    document.getElementById('nextSlideBtn').addEventListener('click', () => changeSlide(1));

    // Добавление элементов
    document.getElementById('addTextBtn').addEventListener('click', addTextElement);
    document.getElementById('addImageBtn').addEventListener('click', addImageFromUrl);
    document.getElementById('uploadImageBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    document.getElementById('mirrorImageBtn').addEventListener('click', toggleImageMirror);
    document.getElementById('startCropBtn').addEventListener('click', toggleImageCropMode);
    document.getElementById('resetCropBtn').addEventListener('click', resetImageCrop);

    // Анимация
    document.getElementById('applyAnimationBtn').addEventListener('click', applyAnimation);

    // Стили
    document.getElementById('textColorPicker').addEventListener('input', updateTextColor);
    document.getElementById('fontSizeSlider').addEventListener('input', updateFontSize);
    document.getElementById('slideBgColorPicker').addEventListener('input', updateSlideBackgroundFromPicker);
    document.getElementById('slideBgHexInput').addEventListener('input', updateSlideBackgroundFromHex);
    document.getElementById('fontFamilySelect').addEventListener('change', updateFontFamily);
    document.querySelectorAll('#textAlignGroup .btn-toggle').forEach(btn => {
        btn.addEventListener('click', () => updateTextAlign(btn.dataset.align));
    });
    document.getElementById('boldToggle').addEventListener('click', toggleBold);
    document.getElementById('italicToggle').addEventListener('click', toggleItalic);
    document.getElementById('underlineToggle').addEventListener('click', toggleUnderline);

    // Экспорт
    document.getElementById('exportBtn').addEventListener('click', () => {
        document.getElementById('exportModal').style.display = 'block';
    });
    document.getElementById('exportPDFBtn').addEventListener('click', exportToPDF);
    document.getElementById('exportGIFBtn').addEventListener('click', exportCurrentSlideToGIF);

    // Закрытие модального окна
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('exportModal').style.display = 'none';
    });

    // Загрузка
    document.getElementById('loadBtn').addEventListener('click', () => {
        document.getElementById('loadFileInput').click();
    });
    document.getElementById('loadFileInput').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            loadPresentation(e.target.files[0]);
        }
    });

    // Закрытие модального окна при клике вне его
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('exportModal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Добавление фигур
    document.getElementById('addRectangleBtn').addEventListener('click', () => addShape('rectangle'));
    document.getElementById('addCircleBtn').addEventListener('click', () => addShape('circle'));
    document.getElementById('addOvalBtn').addEventListener('click', () => addShape('oval'));
    document.getElementById('addTriangleBtn').addEventListener('click', () => addShape('triangle'));
    document.getElementById('addStarBtn').addEventListener('click', () => addShape('star'));
    document.getElementById('addLineBtn').addEventListener('click', () => addShape('line'));
    
    // Цвета фигур
    document.getElementById('shapeFillColorPicker').addEventListener('input', updateShapeFillColor);
    document.getElementById('shapeStrokeColorPicker').addEventListener('input', updateShapeStrokeColor);
    document.getElementById('shapeStrokeWidthSlider').addEventListener('input', updateShapeStrokeWidth);

    // Аккордеон: открываем только одну секцию
    document.querySelectorAll('.sidebar-accordion').forEach(details => {
        details.addEventListener('toggle', () => {
            if (details.open) {
                document.querySelectorAll('.sidebar-accordion').forEach(other => {
                    if (other !== details) {
                        other.open = false;
                    }
                });
            }
        });
    });

    syncShapeControls();
}

// Управление слайдами
function createNewSlide() {
    const slideId = slides.length + 1;
    slides.push({
        id: slideId,
        elements: [],
        background: '#ffffff'
    });
    currentSlideIndex = slides.length - 1;
    renderSlide();
    updateSlidesList();
    updateSlideCounter();
}

function changeSlide(direction) {
    const newIndex = currentSlideIndex + direction;
    if (newIndex >= 0 && newIndex < slides.length) {
        currentSlideIndex = newIndex;
        renderSlide();
        updateSlideCounter();
    }
}

function renderSlide() {
    const slideContent = document.getElementById('slideContent');
    slideContent.innerHTML = '';
    selectedElement = null;
    activeEditable = null;

    const currentSlide = slides[currentSlideIndex];
    if (!currentSlide) return;
    const slideEl = document.getElementById('currentSlide');
    slideEl.style.background = currentSlide.background || '#ffffff';
    syncSlideBackgroundControls(currentSlide.background || '#ffffff');

    currentSlide.elements.forEach(element => {
        const elementDiv = createElementDiv(element);
        slideContent.appendChild(elementDiv);
    });

    syncImageCropButtons();
    syncShapeControls();

    // Обновляем активный слайд в списке
    updateSlidesList();
}

function updateSlidesList() {
    const slidesList = document.getElementById('slidesList');
    slidesList.innerHTML = '';

    slides.forEach((slide, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'slide-thumbnail';
        thumbnail.draggable = true;
        thumbnail.dataset.index = index;
        if (index === currentSlideIndex) {
            thumbnail.classList.add('active');
        }
        
        const slideText = document.createElement('span');
        slideText.textContent = `Слайд ${slide.id}`;
        thumbnail.appendChild(slideText);
        
        let deleteBtn = null;
        const actions = document.createElement('div');
        actions.className = 'slide-actions';
        
        const duplicateBtn = document.createElement('button');
        duplicateBtn.textContent = '⧉';
        duplicateBtn.className = 'duplicate-slide-btn';
        duplicateBtn.title = 'Дублировать слайд';
        duplicateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            duplicateSlide(index);
        });
        actions.appendChild(duplicateBtn);

        if (slides.length > 1) {
            deleteBtn = document.createElement('button');
            deleteBtn.textContent = '×';
            deleteBtn.className = 'delete-slide-btn';
            deleteBtn.style.cssText = 'float: right; background: #ff4444; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 14px;';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteSlide(index);
            });
            actions.appendChild(deleteBtn);
        }
        
        thumbnail.appendChild(actions);
        
        thumbnail.addEventListener('click', (e) => {
            if (!deleteBtn || e.target !== deleteBtn) {
                currentSlideIndex = index;
                renderSlide();
                updateSlideCounter();
            }
        });

        thumbnail.addEventListener('dragstart', (e) => {
            thumbnail.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(index));
        });

        thumbnail.addEventListener('dragend', () => {
            thumbnail.classList.remove('dragging');
            document.querySelectorAll('.slide-thumbnail').forEach(el => {
                el.classList.remove('drag-over');
            });
        });

        thumbnail.addEventListener('dragover', (e) => {
            e.preventDefault();
            thumbnail.classList.add('drag-over');
            e.dataTransfer.dropEffect = 'move';
        });

        thumbnail.addEventListener('dragleave', () => {
            thumbnail.classList.remove('drag-over');
        });

        thumbnail.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
            const toIndex = parseInt(thumbnail.dataset.index, 10);
            if (!Number.isNaN(fromIndex) && !Number.isNaN(toIndex)) {
                moveSlide(fromIndex, toIndex);
            }
            thumbnail.classList.remove('drag-over');
        });

        slidesList.appendChild(thumbnail);
    });
}

function updateSlideCounter() {
    document.getElementById('slideCounter').textContent = 
        `Слайд ${currentSlideIndex + 1} из ${slides.length}`;
}

// Добавление элементов
function addTextElement() {
    const elementId = `element-${++elementIdCounter}`;
    const element = {
        id: elementId,
        type: 'text',
        content: 'Нажмите для редактирования',
        x: 100,
        y: 100,
        width: 500,
        height: 200,
        fontSize: 24,
        fontFamily: 'Segoe UI',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'left',
        color: '#000000',
        animation: '',
        collapsed: false,
        rotation: 0
    };

    slides[currentSlideIndex].elements.push(element);
    renderSlide();
    selectElement(elementId);
    requestAnimationFrame(() => startInlineTextEditing(elementId));
}

function addImageFromUrl() {
    const url = document.getElementById('imageUrlInput').value.trim();
    if (!url) {
        alert('Пожалуйста, введите URL изображения');
        return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        const elementId = `element-${++elementIdCounter}`;
        const element = {
            id: elementId,
            type: 'image',
            src: url,
            x: 200,
            y: 200,
            width: img.width > 400 ? 400 : img.width,
            height: img.height > 300 ? 300 : img.height,
            animation: '',
            crop: null,
            flipped: false
        };

        slides[currentSlideIndex].elements.push(element);
        renderSlide();
        selectElement(elementId);
        document.getElementById('imageUrlInput').value = '';
    };
    img.onerror = () => {
        alert('Не удалось загрузить изображение. Проверьте URL.');
    };
    img.src = url;
}

function handleFileUpload(event) {
    const fileInput = event.target;
    const file = fileInput.files[0];
    if (!file) {
        fileInput.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const elementId = `element-${++elementIdCounter}`;
        const img = new Image();
        img.onload = () => {
            const element = {
                id: elementId,
                type: 'image',
                src: e.target.result,
                x: 200,
                y: 200,
                width: img.width > 400 ? 400 : img.width,
                height: img.height > 300 ? 300 : img.height,
                animation: '',
                crop: null,
                flipped: false
            };

            slides[currentSlideIndex].elements.push(element);
            renderSlide();
            selectElement(elementId);
            fileInput.value = '';
        };
        img.src = e.target.result;
    };
    reader.onerror = () => {
        fileInput.value = '';
    };
    reader.readAsDataURL(file);
}

function createElementDiv(element) {
    const div = document.createElement('div');
    div.className = 'slide-element';
    div.id = element.id;
    div.dataset.elementType = element.type;
    div.style.left = element.x + 'px';
    div.style.top = element.y + 'px';
    div.style.width = element.width + 'px';
    div.style.height = element.height + 'px';
    div.style.transform = `rotate(${element.rotation || 0}deg)`;
    div.style.transformOrigin = 'center center';

    if (element.animation) {
        div.classList.add(`animate-${element.animation}`);
    }

    if (element.type === 'text') {
        // Кнопка сворачивания/разворачивания
        const collapseBtn = document.createElement('button');
        collapseBtn.className = 'collapse-btn';
        collapseBtn.textContent = element.collapsed ? '▶' : '▼';
        collapseBtn.title = element.collapsed ? 'Развернуть' : 'Свернуть';
        collapseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            element.collapsed = !element.collapsed;
            renderSlide();
            selectElement(element.id);
        });
        div.appendChild(collapseBtn);
        
        const textBox = createEditableTextNode(element, 'slide-text');
        textBox.style.height = element.collapsed ? '30px' : '100%';
        textBox.style.overflow = element.collapsed ? 'hidden' : 'auto';
        div.appendChild(textBox);
    } else if (element.type === 'image') {
        const imageFrame = document.createElement('div');
        imageFrame.className = 'slide-image-frame';
        imageFrame.style.position = 'absolute';
        imageFrame.style.inset = '0';
        imageFrame.style.overflow = 'hidden';
        imageFrame.style.borderRadius = '8px';

        const img = document.createElement('img');
        img.className = 'slide-image';
        img.src = element.src;
        img.style.borderRadius = '0';
        applyImageCropStyles(img, element);
        img.draggable = false;
        imageFrame.appendChild(img);
        div.appendChild(imageFrame);

        if (activeCropSession && activeCropSession.elementId === element.id) {
            addCropOverlay(div, element);
        }
    } else if (element.type === 'shape') {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        
        let shapeElement;
        const fillColor = element.fillColor || '#667eea';
        const strokeColor = element.strokeColor || '#000000';
        const strokeWidth = element.strokeWidth || 2;
        
        switch(element.shapeType) {
            case 'rectangle':
                shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                shapeElement.setAttribute('x', '0');
                shapeElement.setAttribute('y', '0');
                shapeElement.setAttribute('width', '100');
                shapeElement.setAttribute('height', '100');
                shapeElement.setAttribute('fill', fillColor);
                shapeElement.setAttribute('stroke', strokeColor);
                shapeElement.setAttribute('stroke-width', strokeWidth);
                break;
            case 'circle':
                shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                shapeElement.setAttribute('cx', '50');
                shapeElement.setAttribute('cy', '50');
                shapeElement.setAttribute('r', '45');
                shapeElement.setAttribute('fill', fillColor);
                shapeElement.setAttribute('stroke', strokeColor);
                shapeElement.setAttribute('stroke-width', strokeWidth);
                break;
            case 'oval':
                shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                shapeElement.setAttribute('cx', '50');
                shapeElement.setAttribute('cy', '50');
                shapeElement.setAttribute('rx', '45');
                shapeElement.setAttribute('ry', '35');
                shapeElement.setAttribute('fill', fillColor);
                shapeElement.setAttribute('stroke', strokeColor);
                shapeElement.setAttribute('stroke-width', strokeWidth);
                break;
            case 'triangle':
                shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                shapeElement.setAttribute('points', '50,8 92,92 8,92');
                shapeElement.setAttribute('fill', fillColor);
                shapeElement.setAttribute('stroke', strokeColor);
                shapeElement.setAttribute('stroke-width', strokeWidth);
                break;
            case 'star':
                shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                shapeElement.setAttribute('points', '50,6 61,37 95,37 67,57 78,92 50,72 22,92 33,57 5,37 39,37');
                shapeElement.setAttribute('fill', fillColor);
                shapeElement.setAttribute('stroke', strokeColor);
                shapeElement.setAttribute('stroke-width', strokeWidth);
                break;
            case 'line':
                shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                shapeElement.setAttribute('x1', '10');
                shapeElement.setAttribute('y1', '50');
                shapeElement.setAttribute('x2', '90');
                shapeElement.setAttribute('y2', '50');
                shapeElement.setAttribute('stroke', fillColor);
                shapeElement.setAttribute('stroke-width', strokeWidth);
                break;
        }
        
        if (shapeElement) {
            shapeElement.setAttribute('class', 'shape-element');
            svg.appendChild(shapeElement);
            div.appendChild(svg);
        }

        const shapeText = createEditableTextNode(element, 'shape-text');
        shapeText.style.display = element.content ? 'flex' : 'none';
        shapeText.style.alignItems = 'center';
        shapeText.style.justifyContent = 'center';
        shapeText.style.pointerEvents = 'auto';
        div.appendChild(shapeText);
    }

    // Кнопка удаления
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteElement(element.id);
    });
    div.appendChild(deleteBtn);

    // Перемещение элемента
    makeDraggable(div, element);

    // Выбор элемента
    div.addEventListener('click', (e) => {
        if (e.target !== deleteBtn && 
            !e.target.classList.contains('resize-handle') && 
            !e.target.classList.contains('collapse-btn') &&
            !e.target.classList.contains('rotation-handle')) {
            selectElement(element.id);
        }
    });

    if (element.type === 'text' || element.type === 'shape') {
        div.addEventListener('dblclick', (e) => {
            if (e.target === deleteBtn ||
                e.target.classList.contains('resize-handle') ||
                e.target.classList.contains('collapse-btn') ||
                e.target.classList.contains('rotation-handle')) {
                return;
            }
            e.stopPropagation();
            selectElement(element.id);
            startInlineTextEditing(element.id);
        });
    }

    return div;
}

function createEditableTextNode(element, extraClass = '') {
    const textBox = document.createElement('div');
    textBox.className = `editable-text ${extraClass}`.trim();
    textBox.textContent = element.content || '';
    textBox.style.fontSize = (element.fontSize || 24) + 'px';
    textBox.style.color = element.color || '#000000';
    textBox.style.fontFamily = element.fontFamily || 'Segoe UI';
    textBox.style.fontWeight = element.fontWeight || 'normal';
    textBox.style.fontStyle = element.fontStyle || 'normal';
    textBox.style.textDecoration = element.textDecoration || 'none';
    textBox.style.textAlign = element.textAlign || 'left';

    textBox.addEventListener('input', () => {
        element.content = textBox.innerText.replace(/\r\n/g, '\n');
        if (element.type === 'shape' && !textBox.isContentEditable) {
            textBox.style.display = element.content ? 'flex' : 'none';
        }
    });

    textBox.addEventListener('mousedown', (e) => {
        if (textBox.isContentEditable) {
            e.stopPropagation();
        }
    });

    textBox.addEventListener('blur', () => {
        finishInlineTextEditing(textBox, element);
    });

    return textBox;
}

// Добавление элементов управления размером
function addResizeHandles(elementDiv, element) {
    // Удаляем старые handles если есть
    elementDiv.querySelectorAll('.resize-handle').forEach(h => h.remove());
    
    if (!['image', 'shape', 'text'].includes(element.type)) return;
    
    const handles = [
        { position: 'nw', cursor: 'nw-resize' },
        { position: 'ne', cursor: 'ne-resize' },
        { position: 'sw', cursor: 'sw-resize' },
        { position: 'se', cursor: 'se-resize' },
        { position: 'n', cursor: 'n-resize' },
        { position: 's', cursor: 's-resize' },
        { position: 'w', cursor: 'w-resize' },
        { position: 'e', cursor: 'e-resize' }
    ];
    
    handles.forEach(handle => {
        const handleDiv = document.createElement('div');
        handleDiv.className = `resize-handle resize-handle-${handle.position}`;
        handleDiv.style.cssText = `
            position: absolute;
            width: 10px;
            height: 10px;
            background: #667eea;
            border: 2px solid white;
            border-radius: 50%;
            cursor: ${handle.cursor};
            z-index: 1000;
        `;
        
        // Позиционирование
        switch(handle.position) {
            case 'nw': handleDiv.style.top = '-5px'; handleDiv.style.left = '-5px'; break;
            case 'ne': handleDiv.style.top = '-5px'; handleDiv.style.right = '-5px'; break;
            case 'sw': handleDiv.style.bottom = '-5px'; handleDiv.style.left = '-5px'; break;
            case 'se': handleDiv.style.bottom = '-5px'; handleDiv.style.right = '-5px'; break;
            case 'n': handleDiv.style.top = '-5px'; handleDiv.style.left = '50%'; handleDiv.style.transform = 'translateX(-50%)'; break;
            case 's': handleDiv.style.bottom = '-5px'; handleDiv.style.left = '50%'; handleDiv.style.transform = 'translateX(-50%)'; break;
            case 'w': handleDiv.style.left = '-5px'; handleDiv.style.top = '50%'; handleDiv.style.transform = 'translateY(-50%)'; break;
            case 'e': handleDiv.style.right = '-5px'; handleDiv.style.top = '50%'; handleDiv.style.transform = 'translateY(-50%)'; break;
        }
        
        makeResizable(handleDiv, elementDiv, element, handle.position);
        elementDiv.appendChild(handleDiv);
    });
}

// Функция изменения размера
function makeResizable(handle, elementDiv, element, position) {
    let isResizing = false;
    let startX, startY, startWidth, startHeight, startLeft, startTop;
    
    handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = element.width;
        startHeight = element.height;
        startLeft = element.x;
        startTop = element.y;
        
        document.addEventListener('mousemove', onResizeMove);
        document.addEventListener('mouseup', onResizeUp);
        e.preventDefault();
    });
    
    function onResizeMove(e) {
        if (!isResizing) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const isPerfectCircle = element.type === 'shape' && element.shapeType === 'circle';
        
        let newWidth = startWidth;
        let newHeight = startHeight;
        let newX = startLeft;
        let newY = startTop;
        
        // Минимальный размер
        const minWidth = element.type === 'text' ? 120 : 50;
        const minHeight = element.type === 'text' ? 50 : 50;
        
        if (isPerfectCircle) {
            const startSize = Math.max(startWidth, startHeight);
            let newSize = startSize;

            switch(position) {
                case 'se':
                    newSize = Math.max(minWidth, startSize + Math.max(deltaX, deltaY));
                    break;
                case 'sw':
                    newSize = Math.max(minWidth, startSize + Math.max(-deltaX, deltaY));
                    newX = startLeft + (startWidth - newSize);
                    break;
                case 'ne':
                    newSize = Math.max(minWidth, startSize + Math.max(deltaX, -deltaY));
                    newY = startTop + (startHeight - newSize);
                    break;
                case 'nw':
                    newSize = Math.max(minWidth, startSize + Math.max(-deltaX, -deltaY));
                    newX = startLeft + (startWidth - newSize);
                    newY = startTop + (startHeight - newSize);
                    break;
                case 'e':
                    newSize = Math.max(minWidth, startSize + deltaX);
                    newY = startTop + (startHeight - newSize) / 2;
                    break;
                case 'w':
                    newSize = Math.max(minWidth, startSize - deltaX);
                    newX = startLeft + (startWidth - newSize);
                    newY = startTop + (startHeight - newSize) / 2;
                    break;
                case 's':
                    newSize = Math.max(minWidth, startSize + deltaY);
                    newX = startLeft + (startWidth - newSize) / 2;
                    break;
                case 'n':
                    newSize = Math.max(minWidth, startSize - deltaY);
                    newX = startLeft + (startWidth - newSize) / 2;
                    newY = startTop + (startHeight - newSize);
                    break;
            }

            newWidth = newSize;
            newHeight = newSize;
        } else {
            switch(position) {
                case 'se':
                    newWidth = Math.max(minWidth, startWidth + deltaX);
                    newHeight = Math.max(minHeight, startHeight + deltaY);
                    break;
                case 'sw':
                    newWidth = Math.max(minWidth, startWidth - deltaX);
                    newHeight = Math.max(minHeight, startHeight + deltaY);
                    newX = startLeft + (startWidth - newWidth);
                    break;
                case 'ne':
                    newWidth = Math.max(minWidth, startWidth + deltaX);
                    newHeight = Math.max(minHeight, startHeight - deltaY);
                    newY = startTop + (startHeight - newHeight);
                    break;
                case 'nw':
                    newWidth = Math.max(minWidth, startWidth - deltaX);
                    newHeight = Math.max(minHeight, startHeight - deltaY);
                    newX = startLeft + (startWidth - newWidth);
                    newY = startTop + (startHeight - newHeight);
                    break;
                case 'e':
                    newWidth = Math.max(minWidth, startWidth + deltaX);
                    break;
                case 'w':
                    newWidth = Math.max(minWidth, startWidth - deltaX);
                    newX = startLeft + (startWidth - newWidth);
                    break;
                case 's':
                    newHeight = Math.max(minHeight, startHeight + deltaY);
                    break;
                case 'n':
                    newHeight = Math.max(minHeight, startHeight - deltaY);
                    newY = startTop + (startHeight - newHeight);
                    break;
            }
        }
        
        element.width = newWidth;
        element.height = newHeight;
        element.x = newX;
        element.y = newY;
        
        elementDiv.style.width = newWidth + 'px';
        elementDiv.style.height = newHeight + 'px';
        elementDiv.style.left = newX + 'px';
        elementDiv.style.top = newY + 'px';
    }
    
    function onResizeUp() {
        isResizing = false;
        document.removeEventListener('mousemove', onResizeMove);
        document.removeEventListener('mouseup', onResizeUp);
    }
}

function addRotationHandle(elementDiv, element) {
    elementDiv.querySelectorAll('.rotation-handle').forEach(h => h.remove());

    if (!['shape', 'text', 'image'].includes(element.type)) return;

    const handle = document.createElement('button');
    handle.className = 'rotation-handle';
    handle.type = 'button';
    handle.textContent = '↻';
    makeRotatable(handle, elementDiv, element);
    elementDiv.appendChild(handle);
}

function applyImageCropStyles(img, element) {
    const crop = element.crop;
    const isFlipped = Boolean(element.flipped);

    img.style.position = 'absolute';
    img.style.maxWidth = 'none';
    img.style.maxHeight = 'none';
    img.style.objectFit = 'fill';
    img.style.transformOrigin = 'center center';
    img.style.transform = isFlipped ? 'scaleX(-1)' : 'none';

    if (!crop) {
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.left = '0';
        img.style.top = '0';
        return;
    }

    const safeWidth = Math.max(crop.width, 0.05);
    const safeHeight = Math.max(crop.height, 0.05);
    img.style.width = `${100 / safeWidth}%`;
    img.style.height = `${100 / safeHeight}%`;
    img.style.left = `${-(crop.x / safeWidth) * 100}%`;
    img.style.top = `${-(crop.y / safeHeight) * 100}%`;
}

function addCropOverlay(elementDiv, element) {
    const crop = activeCropSession?.draftCrop;
    if (!crop) return;

    const overlay = document.createElement('div');
    overlay.className = 'crop-overlay';
    overlay.style.left = `${crop.x * 100}%`;
    overlay.style.top = `${crop.y * 100}%`;
    overlay.style.width = `${crop.width * 100}%`;
    overlay.style.height = `${crop.height * 100}%`;

    const frame = document.createElement('div');
    frame.className = 'crop-frame';
    overlay.appendChild(frame);

    makeCropMovable(overlay, element);

    ['nw', 'ne', 'sw', 'se'].forEach(position => {
        const handle = document.createElement('div');
        handle.className = `crop-handle crop-handle-${position}`;
        makeCropResizable(handle, overlay, element, position);
        overlay.appendChild(handle);
    });

    elementDiv.appendChild(overlay);
}

function makeRotatable(handle, elementDiv, element) {
    let isRotating = false;

    handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        isRotating = true;
        document.addEventListener('mousemove', onRotateMove);
        document.addEventListener('mouseup', onRotateUp);
        e.preventDefault();
    });

    function onRotateMove(e) {
        if (!isRotating) return;

        const rect = elementDiv.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

        element.rotation = angle + 90;
        elementDiv.style.transform = `rotate(${element.rotation}deg)`;
    }

    function onRotateUp() {
        isRotating = false;
        document.removeEventListener('mousemove', onRotateMove);
        document.removeEventListener('mouseup', onRotateUp);
    }
}

function makeDraggable(elementDiv, element) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    elementDiv.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('resize-handle') ||
            e.target.classList.contains('rotation-handle') ||
            e.target.classList.contains('crop-overlay') ||
            e.target.classList.contains('crop-frame') ||
            e.target.classList.contains('crop-handle') ||
            e.target.classList.contains('delete-btn') ||
            e.target.classList.contains('collapse-btn')) {
            return;
        }

        const editable = elementDiv.querySelector('.editable-text');
        if (editable && editable.isContentEditable) {
            return;
        }
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = element.x;
        startTop = element.y;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        element.x = startLeft + deltaX;
        element.y = startTop + deltaY;
        elementDiv.style.left = element.x + 'px';
        elementDiv.style.top = element.y + 'px';
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

function selectElement(elementId) {
    // Убираем выделение с предыдущего элемента и удаляем старые handles
    document.querySelectorAll('.slide-element').forEach(el => {
        el.classList.remove('selected');
        el.querySelectorAll('.resize-handle').forEach(h => h.remove());
        el.querySelectorAll('.rotation-handle').forEach(h => h.remove());
    });

    // Выделяем новый элемент
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('selected');
        selectedElement = slides[currentSlideIndex].elements.find(el => el.id === elementId);
        
        if (selectedElement && ['image', 'shape', 'text'].includes(selectedElement.type)) {
            addResizeHandles(element, selectedElement);
        }

        if (selectedElement && ['shape', 'text', 'image'].includes(selectedElement.type)) {
            addRotationHandle(element, selectedElement);
        }
        
        if (supportsTextStyling(selectedElement)) {
            syncTextControls(selectedElement);
        }

        syncImageCropButtons();
        syncShapeControls();
    }
}

function deleteElement(elementId) {
    const slide = slides[currentSlideIndex];
    slide.elements = slide.elements.filter(el => el.id !== elementId);
    if (activeCropSession && activeCropSession.elementId === elementId) {
        activeCropSession = null;
    }
    renderSlide();
}

function deleteSlide(index) {
    if (slides.length <= 1) {
        alert('Нельзя удалить последний слайд!');
        return;
    }
    
    if (confirm('Вы уверены, что хотите удалить этот слайд?')) {
        slides.splice(index, 1);
        if (currentSlideIndex >= slides.length) {
            currentSlideIndex = slides.length - 1;
        }
        renderSlide();
        updateSlidesList();
        updateSlideCounter();
    }
}

function duplicateSlide(index) {
    const source = slides[index];
    if (!source) return;

    const clone = JSON.parse(JSON.stringify(source));
    clone.id = slides.length + 1;
    clone.elements = clone.elements.map(el => {
        const newId = `element-${++elementIdCounter}`;
        return { ...el, id: newId };
    });

    const insertIndex = index + 1;
    slides.splice(insertIndex, 0, clone);
    currentSlideIndex = insertIndex;
    renderSlide();
    updateSlidesList();
    updateSlideCounter();
}
function moveSlide(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= slides.length || toIndex >= slides.length) return;

    const [moved] = slides.splice(fromIndex, 1);
    slides.splice(toIndex, 0, moved);

    if (currentSlideIndex === fromIndex) {
        currentSlideIndex = toIndex;
    } else if (fromIndex < currentSlideIndex && toIndex >= currentSlideIndex) {
        currentSlideIndex -= 1;
    } else if (fromIndex > currentSlideIndex && toIndex <= currentSlideIndex) {
        currentSlideIndex += 1;
    }

    renderSlide();
    updateSlideCounter();
}

// Анимация
function applyAnimation() {
    if (!selectedElement) {
        alert('Выберите элемент для применения анимации');
        return;
    }

    const animation = document.getElementById('animationSelect').value;
    if (!animation) {
        alert('Выберите тип анимации');
        return;
    }

    selectedElement.animation = animation;
    const selectedId = selectedElement.id;
    renderSlide();
    selectElement(selectedId);
}

// Стили
function updateTextColor() {
    if (!selectedElement || !supportsTextStyling(selectedElement)) return;
    
    const color = document.getElementById('textColorPicker').value;
    selectedElement.color = color;
    
    const textBox = document.querySelector(`#${selectedElement.id} .editable-text`);
    if (textBox) {
        textBox.style.color = color;
    }
}

function updateFontSize() {
    if (!selectedElement || !supportsTextStyling(selectedElement)) return;
    
    const fontSize = document.getElementById('fontSizeSlider').value;
    selectedElement.fontSize = parseInt(fontSize);
    
    const textBox = document.querySelector(`#${selectedElement.id} .editable-text`);
    if (textBox) {
        textBox.style.fontSize = fontSize + 'px';
    }
    
    document.getElementById('fontSizeValue').textContent = fontSize + 'px';
}

function updateSlideBackgroundFromPicker() {
    const color = document.getElementById('slideBgColorPicker').value;
    applySlideBackground(color);
}

function updateSlideBackgroundFromHex() {
    const hex = document.getElementById('slideBgHexInput').value.trim();
    if (!isValidHexColor(hex)) {
        return;
    }
    const normalized = normalizeHex(hex);
    applySlideBackground(normalized);
}

function applySlideBackground(color) {
    const currentSlide = slides[currentSlideIndex];
    if (!currentSlide) return;
    currentSlide.background = color;
    const slideEl = document.getElementById('currentSlide');
    slideEl.style.background = color;
    document.getElementById('slideBgColorPicker').value = color;
    document.getElementById('slideBgHexInput').value = color;
}

function syncSlideBackgroundControls(color) {
    document.getElementById('slideBgColorPicker').value = color;
    document.getElementById('slideBgHexInput').value = color;
}

function isValidHexColor(value) {
    return /^#?([0-9a-fA-F]{6})$/.test(value);
}

function normalizeHex(value) {
    return value.startsWith('#') ? value.toLowerCase() : `#${value.toLowerCase()}`;
}

function updateFontFamily() {
    if (!selectedElement || !supportsTextStyling(selectedElement)) return;
    
    const fontFamily = document.getElementById('fontFamilySelect').value;
    selectedElement.fontFamily = fontFamily;
    
    const textBox = document.querySelector(`#${selectedElement.id} .editable-text`);
    if (textBox) {
        textBox.style.fontFamily = fontFamily;
    }
}

function updateTextAlign(align) {
    if (!selectedElement || !supportsTextStyling(selectedElement)) return;
    
    selectedElement.textAlign = align;
    const textBox = document.querySelector(`#${selectedElement.id} .editable-text`);
    if (textBox) {
        textBox.style.textAlign = align;
    }
    
    document.querySelectorAll('#textAlignGroup .btn-toggle').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.align === align);
    });
}

function toggleBold() {
    if (!selectedElement || !supportsTextStyling(selectedElement)) return;
    
    selectedElement.fontWeight = selectedElement.fontWeight === 'bold' ? 'normal' : 'bold';
    const textBox = document.querySelector(`#${selectedElement.id} .editable-text`);
    if (textBox) {
        textBox.style.fontWeight = selectedElement.fontWeight;
    }
    document.getElementById('boldToggle').classList.toggle('active', selectedElement.fontWeight === 'bold');
}

function toggleItalic() {
    if (!selectedElement || !supportsTextStyling(selectedElement)) return;
    
    selectedElement.fontStyle = selectedElement.fontStyle === 'italic' ? 'normal' : 'italic';
    const textBox = document.querySelector(`#${selectedElement.id} .editable-text`);
    if (textBox) {
        textBox.style.fontStyle = selectedElement.fontStyle;
    }
    document.getElementById('italicToggle').classList.toggle('active', selectedElement.fontStyle === 'italic');
}

function toggleUnderline() {
    if (!selectedElement || !supportsTextStyling(selectedElement)) return;
    
    selectedElement.textDecoration = selectedElement.textDecoration === 'underline' ? 'none' : 'underline';
    const textBox = document.querySelector(`#${selectedElement.id} .editable-text`);
    if (textBox) {
        textBox.style.textDecoration = selectedElement.textDecoration;
    }
    document.getElementById('underlineToggle').classList.toggle('active', selectedElement.textDecoration === 'underline');
}

function syncTextControls(element) {
    document.getElementById('textColorPicker').value = element.color || '#000000';
    const fontSize = element.fontSize || 24;
    document.getElementById('fontSizeSlider').value = fontSize;
    document.getElementById('fontSizeValue').textContent = fontSize + 'px';
    
    document.getElementById('fontFamilySelect').value = element.fontFamily || 'Segoe UI';
    
    const align = element.textAlign || 'left';
    document.querySelectorAll('#textAlignGroup .btn-toggle').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.align === align);
    });
    
    document.getElementById('boldToggle').classList.toggle('active', (element.fontWeight || 'normal') === 'bold');
    document.getElementById('italicToggle').classList.toggle('active', (element.fontStyle || 'normal') === 'italic');
    document.getElementById('underlineToggle').classList.toggle('active', (element.textDecoration || 'none') === 'underline');
}

function supportsTextStyling(element) {
    return element && (element.type === 'text' || element.type === 'shape');
}

function startInlineTextEditing(elementId) {
    const elementDiv = document.getElementById(elementId);
    const element = slides[currentSlideIndex]?.elements.find(el => el.id === elementId);
    const textBox = elementDiv?.querySelector('.editable-text');

    if (!elementDiv || !element || !textBox) return;

    if (activeEditable && activeEditable !== textBox) {
        const previousElement = slides[currentSlideIndex]?.elements.find(el => el.id === activeEditable.closest('.slide-element')?.id);
        if (previousElement) {
            finishInlineTextEditing(activeEditable, previousElement);
        }
    }

    activeEditable = textBox;
    textBox.contentEditable = 'true';
    textBox.classList.add('is-editing');
    if (element.type === 'shape') {
        textBox.style.display = 'flex';
    }
    placeCaretAtEnd(textBox);
    textBox.focus();
}

function finishInlineTextEditing(textBox, element) {
    if (!textBox) return;

    element.content = textBox.innerText.replace(/\r\n/g, '\n').trimEnd();
    textBox.textContent = element.content;
    textBox.contentEditable = 'false';
    textBox.classList.remove('is-editing');
    if (element.type === 'shape') {
        textBox.style.display = element.content ? 'flex' : 'none';
    }
    if (activeEditable === textBox) {
        activeEditable = null;
    }
}

function placeCaretAtEnd(node) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
}

// Экспорт
async function exportToPDF() {
    if (!slides || slides.length === 0) {
        alert('Нет слайдов для экспорта');
        return;
    }

    // Скрываем модалку
    document.getElementById('exportModal').style.display = 'none';

    try {
        // Используем jsPDF напрямую для более надежного экспорта
        const jsPDF = window.jspdf.jsPDF || window.jspdf;
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const slideWidth = 900; // ширина слайда в пикселях
        const slideHeight = 506; // высота слайда в пикселях
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const scale = Math.min(pdfWidth / slideWidth, pdfHeight / slideHeight) * 0.95;

        // Сохраняем текущий слайд
        const savedSlideIndex = currentSlideIndex;

        for (let i = 0; i < slides.length; i++) {
            if (i > 0) {
                pdf.addPage();
            }

            // Переключаемся на нужный слайд и рендерим его
            currentSlideIndex = i;
            renderSlide();

            // Ждем рендеринга
            await new Promise(resolve => setTimeout(resolve, 300));

            const slideElement = document.getElementById('currentSlide');
            
            // Ждем загрузки всех изображений
            const imgs = slideElement.querySelectorAll('img');
            await Promise.all(Array.from(imgs).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                    setTimeout(resolve, 2000); // таймаут на случай проблем
                });
            }));

            // Конвертируем слайд в canvas
            const canvas = await html2canvas(slideElement, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: slideWidth,
                height: slideHeight
            });

            // Добавляем canvas в PDF
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const imgWidth = slideWidth * scale;
            const imgHeight = slideHeight * scale;
            const x = (pdfWidth - imgWidth) / 2;
            const y = (pdfHeight - imgHeight) / 2;

            pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
        }

        // Восстанавливаем текущий слайд
        currentSlideIndex = savedSlideIndex;
        renderSlide();

        // Сохраняем PDF
        pdf.save('presentation.pdf');
    } catch (error) {
        console.error('Ошибка при экспорте:', error);
        alert('Ошибка при экспорте PDF. Проверьте консоль для деталей.');
    }
}

async function exportCurrentSlideToGIF() {
    if (!slides || slides.length === 0) {
        alert('Нет слайдов для экспорта');
        return;
    }

    if (!window.GIF) {
        alert('GIF библиотека не загружена. Обновите страницу и попробуйте снова.');
        return;
    }

    const exportBtn = document.getElementById('exportGIFBtn');
    exportBtn.disabled = true;
    exportBtn.textContent = 'Готовим GIF...';
    document.getElementById('exportModal').style.display = 'none';

    try {
        const slideElement = document.getElementById('currentSlide');
        if (!slideElement) {
            throw new Error('Слайд не найден');
        }

        const wasSelected = selectedElement ? selectedElement.id : null;
        document.querySelectorAll('.slide-element').forEach(el => {
            el.classList.remove('selected');
            el.querySelectorAll('.resize-handle').forEach(h => h.remove());
            el.querySelectorAll('.rotation-handle').forEach(h => h.remove());
        });
        selectedElement = null;

        restartSlideAnimations(slideElement);
        await new Promise(resolve => setTimeout(resolve, 80));

        const frameDelay = 100;
        const framesCount = 20;
        const gif = new window.GIF({
            workers: 2,
            quality: 10,
            width: slideElement.clientWidth,
            height: slideElement.clientHeight,
            workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js'
        });

        for (let i = 0; i < framesCount; i++) {
            const canvas = await html2canvas(slideElement, {
                scale: 1,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: slideElement.clientWidth,
                height: slideElement.clientHeight
            });
            gif.addFrame(canvas, { delay: frameDelay, copy: true });
            await new Promise(resolve => setTimeout(resolve, frameDelay));
        }

        const blob = await new Promise((resolve, reject) => {
            gif.on('finished', resolve);
            gif.on('abort', () => reject(new Error('Рендер GIF прерван')));
            gif.render();
        });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `slide-${currentSlideIndex + 1}.gif`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);

        if (wasSelected) {
            selectElement(wasSelected);
        } else {
            renderSlide();
        }
    } catch (error) {
        console.error('Ошибка при экспорте GIF:', error);
        alert('Не удалось экспортировать GIF. Проверьте консоль для деталей.');
    } finally {
        exportBtn.disabled = false;
        exportBtn.textContent = 'Текущий слайд в GIF';
    }
}

function restartSlideAnimations(slideElement) {
    const animatedElements = slideElement.querySelectorAll('.slide-element[class*="animate-"]');
    animatedElements.forEach(el => {
        el.style.animation = 'none';
    });
    // Принудительный reflow для перезапуска CSS анимаций
    void slideElement.offsetHeight;
    animatedElements.forEach(el => {
        el.style.animation = '';
    });
}


// Добавление фигур
function addShape(shapeType) {
    const elementId = `element-${++elementIdCounter}`;
    const fillColor = document.getElementById('shapeFillColorPicker').value;
    const strokeColor = document.getElementById('shapeStrokeColorPicker').value;
    const strokeWidth = parseInt(document.getElementById('shapeStrokeWidthSlider').value, 10) || 2;
    const isCircle = shapeType === 'circle';
    
    const element = {
        id: elementId,
        type: 'shape',
        shapeType: shapeType,
        x: 200,
        y: 200,
        width: isCircle ? 180 : 200,
        height: isCircle ? 180 : 150,
        fillColor: fillColor,
        strokeColor: strokeColor,
        strokeWidth: strokeWidth,
        animation: '',
        rotation: 0,
        content: '',
        fontSize: 24,
        fontFamily: 'Segoe UI',
        fontWeight: '600',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'center',
        color: '#ffffff'
    };

    slides[currentSlideIndex].elements.push(element);
    renderSlide();
    selectElement(elementId);
}

function updateShapeFillColor() {
    if (!selectedElement || selectedElement.type !== 'shape') return;
    
    const color = document.getElementById('shapeFillColorPicker').value;
    selectedElement.fillColor = color;
    
    const shapeElement = document.querySelector(`#${selectedElement.id} .shape-element`);
    if (shapeElement) {
        if (selectedElement.shapeType === 'line') {
            shapeElement.setAttribute('stroke', color);
        } else {
            shapeElement.setAttribute('fill', color);
        }
    }
}

function updateShapeStrokeColor() {
    if (!selectedElement || selectedElement.type !== 'shape') return;
    
    const color = document.getElementById('shapeStrokeColorPicker').value;
    selectedElement.strokeColor = color;
    
    const shapeElement = document.querySelector(`#${selectedElement.id} .shape-element`);
    if (shapeElement) {
        shapeElement.setAttribute('stroke', color);
    }
}

function updateShapeStrokeWidth() {
    const width = parseInt(document.getElementById('shapeStrokeWidthSlider').value, 10) || 2;
    document.getElementById('shapeStrokeWidthValue').textContent = `${width}px`;

    if (!selectedElement || selectedElement.type !== 'shape') return;

    selectedElement.strokeWidth = width;

    const shapeElement = document.querySelector(`#${selectedElement.id} .shape-element`);
    if (shapeElement) {
        shapeElement.setAttribute('stroke-width', width);
    }
}

function syncShapeControls() {
    const fillPicker = document.getElementById('shapeFillColorPicker');
    const strokePicker = document.getElementById('shapeStrokeColorPicker');
    const strokeWidthSlider = document.getElementById('shapeStrokeWidthSlider');
    const strokeWidthValue = document.getElementById('shapeStrokeWidthValue');
    const isShapeSelected = selectedElement && selectedElement.type === 'shape';

    fillPicker.disabled = !isShapeSelected;
    strokePicker.disabled = !isShapeSelected;
    strokeWidthSlider.disabled = !isShapeSelected;

    if (isShapeSelected) {
        fillPicker.value = selectedElement.fillColor || '#667eea';
        strokePicker.value = selectedElement.strokeColor || '#000000';
        const width = selectedElement.strokeWidth || 2;
        strokeWidthSlider.value = width;
        strokeWidthValue.textContent = `${width}px`;
    } else {
        strokeWidthValue.textContent = `${strokeWidthSlider.value}px`;
    }
}

// Загрузка сохраненной презентации
function loadPresentation(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            slides = JSON.parse(e.target.result);
            slides.forEach(slide => {
                slide.background = slide.background || '#ffffff';
                slide.elements = (slide.elements || []).map(normalizeLoadedElement);
            });
            currentSlideIndex = 0;
            elementIdCounter = Math.max(...slides.flatMap(s => s.elements.map(el => {
                const match = el.id.match(/element-(\d+)/);
                return match ? parseInt(match[1]) : 0;
            })), 0);
            renderSlide();
            updateSlidesList();
            updateSlideCounter();
            alert('Презентация успешно загружена!');
        } catch (error) {
            alert('Ошибка при загрузке файла. Проверьте формат файла.');
        }
    };
    reader.readAsText(file);
}

function normalizeLoadedElement(element) {
    const normalized = { ...element };
    normalized.rotation = normalized.rotation || 0;

    if (normalized.type === 'shape') {
        normalized.content = normalized.content || '';
        normalized.fontSize = normalized.fontSize || 24;
        normalized.fontFamily = normalized.fontFamily || 'Segoe UI';
        normalized.fontWeight = normalized.fontWeight || '600';
        normalized.fontStyle = normalized.fontStyle || 'normal';
        normalized.textDecoration = normalized.textDecoration || 'none';
        normalized.textAlign = normalized.textAlign || 'center';
        normalized.color = normalized.color || '#ffffff';
    }

    if (normalized.type === 'text') {
        normalized.content = normalized.content || '';
    }

    if (normalized.type === 'image') {
        normalized.crop = normalized.crop || null;
        normalized.flipped = Boolean(normalized.flipped);
    }

    return normalized;
}

function toggleImageCropMode() {
    if (!selectedElement || selectedElement.type !== 'image') {
        alert('Сначала выберите изображение.');
        return;
    }

    if (activeCropSession && activeCropSession.elementId === selectedElement.id) {
        applyImageCrop();
        return;
    }

    activeCropSession = {
        elementId: selectedElement.id,
        draftCrop: selectedElement.crop
            ? { ...selectedElement.crop }
            : { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }
    };

    const selectedId = selectedElement.id;
    renderSlide();
    selectElement(selectedId);
    syncImageCropButtons();
}

function applyImageCrop() {
    if (!activeCropSession || !selectedElement || selectedElement.type !== 'image') {
        return;
    }

    selectedElement.crop = clampCropRect(activeCropSession.draftCrop);
    const selectedId = selectedElement.id;
    activeCropSession = null;
    renderSlide();
    selectElement(selectedId);
}

function resetImageCrop() {
    if (!selectedElement || selectedElement.type !== 'image') {
        alert('Сначала выберите изображение.');
        return;
    }

    selectedElement.crop = null;
    const selectedId = selectedElement.id;
    if (activeCropSession && activeCropSession.elementId === selectedElement.id) {
        activeCropSession = null;
    }
    renderSlide();
    selectElement(selectedId);
}

function syncImageCropButtons() {
    const mirrorBtn = document.getElementById('mirrorImageBtn');
    const cropBtn = document.getElementById('startCropBtn');
    const resetBtn = document.getElementById('resetCropBtn');
    const isImageSelected = selectedElement && selectedElement.type === 'image';
    const cropActive = isImageSelected && activeCropSession && activeCropSession.elementId === selectedElement.id;
    const isFlipped = isImageSelected && Boolean(selectedElement.flipped);

    mirrorBtn.textContent = isFlipped ? 'Убрать зеркало' : 'Отзеркалить';
    mirrorBtn.disabled = !isImageSelected;
    cropBtn.textContent = cropActive ? 'Применить обрезку' : 'Обрезать фото';
    cropBtn.disabled = !isImageSelected;
    resetBtn.disabled = !isImageSelected;
}

function toggleImageMirror() {
    if (!selectedElement || selectedElement.type !== 'image') {
        alert('Сначала выберите изображение.');
        return;
    }

    selectedElement.flipped = !selectedElement.flipped;
    const selectedId = selectedElement.id;
    renderSlide();
    selectElement(selectedId);
}

function makeCropMovable(overlay, element) {
    overlay.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('crop-handle')) {
            return;
        }

        const startX = e.clientX;
        const startY = e.clientY;
        const startCrop = { ...activeCropSession.draftCrop };

        const onMove = (moveEvent) => {
            const deltaX = (moveEvent.clientX - startX) / element.width;
            const deltaY = (moveEvent.clientY - startY) / element.height;
            const nextCrop = {
                ...startCrop,
                x: startCrop.x + deltaX,
                y: startCrop.y + deltaY
            };

            const clamped = clampCropRect(nextCrop, startCrop.width, startCrop.height);
            activeCropSession.draftCrop = clamped;
            updateCropOverlay(overlay, clamped);
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        e.preventDefault();
        e.stopPropagation();
    });
}

function makeCropResizable(handle, overlay, element, position) {
    handle.addEventListener('mousedown', (e) => {
        const startX = e.clientX;
        const startY = e.clientY;
        const startCrop = { ...activeCropSession.draftCrop };

        const onMove = (moveEvent) => {
            const deltaX = (moveEvent.clientX - startX) / element.width;
            const deltaY = (moveEvent.clientY - startY) / element.height;
            let nextCrop = { ...startCrop };

            if (position.includes('n')) {
                nextCrop.y = startCrop.y + deltaY;
                nextCrop.height = startCrop.height - deltaY;
            }
            if (position.includes('s')) {
                nextCrop.height = startCrop.height + deltaY;
            }
            if (position.includes('w')) {
                nextCrop.x = startCrop.x + deltaX;
                nextCrop.width = startCrop.width - deltaX;
            }
            if (position.includes('e')) {
                nextCrop.width = startCrop.width + deltaX;
            }

            const clamped = clampCropRect(nextCrop);
            activeCropSession.draftCrop = clamped;
            updateCropOverlay(overlay, clamped);
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        e.preventDefault();
        e.stopPropagation();
    });
}

function updateCropOverlay(overlay, crop) {
    overlay.style.left = `${crop.x * 100}%`;
    overlay.style.top = `${crop.y * 100}%`;
    overlay.style.width = `${crop.width * 100}%`;
    overlay.style.height = `${crop.height * 100}%`;
}

function clampCropRect(crop, fixedWidth = null, fixedHeight = null) {
    const minSize = 0.1;
    const next = { ...crop };

    next.width = Math.max(fixedWidth ?? next.width, minSize);
    next.height = Math.max(fixedHeight ?? next.height, minSize);

    if (next.x < 0) next.x = 0;
    if (next.y < 0) next.y = 0;
    if (next.x + next.width > 1) next.x = 1 - next.width;
    if (next.y + next.height > 1) next.y = 1 - next.height;

    if (fixedWidth === null && next.width > 1) next.width = 1;
    if (fixedHeight === null && next.height > 1) next.height = 1;

    if (fixedWidth === null && next.x + next.width > 1) {
        next.width = 1 - next.x;
    }
    if (fixedHeight === null && next.y + next.height > 1) {
        next.height = 1 - next.y;
    }

    next.width = Math.max(next.width, minSize);
    next.height = Math.max(next.height, minSize);
    next.x = Math.min(Math.max(next.x, 0), 1 - next.width);
    next.y = Math.min(Math.max(next.y, 0), 1 - next.height);

    return next;
}
