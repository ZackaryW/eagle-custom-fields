async function updateTheme() {
	const THEME_SUPPORT = {
		AUTO: eagle.app.isDarkColors() ? 'gray' : 'light',
		LIGHT: 'light',
		LIGHTGRAY: 'lightgray',
		GRAY: 'gray',
		DARK: 'dark',
		BLUE: 'blue',
		PURPLE: 'purple',
	};

	const theme = eagle.app.theme.toUpperCase();
	const themeName = THEME_SUPPORT[theme] ?? 'dark';
	const htmlEl = document.querySelector('html');

	htmlEl.classList.add('no-transition');
	htmlEl.setAttribute('theme', themeName);
	htmlEl.setAttribute('platform', eagle.app.platform);
	htmlEl.classList.remove('no-transition');
}

let previousSelectedItems = [];
let selectionInterval;

function startSelectionListener() {
	selectionInterval = setInterval(async () => {
		const currentSelectedItems = await eagle.item.getSelected();
		
		// Check if selection has changed by comparing IDs
		const hasChanged = previousSelectedItems.length !== currentSelectedItems.length || 
			!previousSelectedItems.every((prev, i) => prev.id === currentSelectedItems[i].id);
		
		if (hasChanged) {
			console.log('Selected items changed:', currentSelectedItems);
			previousSelectedItems = currentSelectedItems;
			redraw();
		}
	}, 1000);
}

function stopSelectionListener() {
	if (selectionInterval) {
		clearInterval(selectionInterval);
		selectionInterval = null;
	}
}



async function redraw() {
	
	await eagle.window.setAlwaysOnTop(true);
	updateTheme();

	// update app name on header
	document.getElementById('appName').innerHTML = i18next.t('manifest.app.name')

	// if nothing is selected, show a message
	if (previousSelectedItems.length === 0) {
		document.getElementById('content').innerHTML = i18next.t('app.no_selection');
	} else {
		document.getElementById('content').innerHTML = '';
		
		// Read existing custom fields for the selected item
		const existingFields = customFieldsReader.get(previousSelectedItems[0]);
		
		const fieldManager = new CustomFieldManager((fieldData) => {
			// Save the updated fields when changes occur
			customFieldsReader.set(previousSelectedItems[0], fieldData);
			console.log('Fields updated:', fieldData);
		}, existingFields);

		const container = fieldManager.createContainer();
		document.getElementById('content').appendChild(container);
	}

	// hijack all outsource links to open in default browser
	document.querySelectorAll(`a[href^="http"]`).forEach((element) => {
		element.addEventListener('click', (event) => {
			event.preventDefault();
			eagle.shell.openExternal(event.target.href);
		});
	});

	document.querySelector('.btn-close').addEventListener('click', () => {
		window.close();
	});
}


eagle.onPluginCreate(async (plugin) => {
	console.log('eagle.onPluginCreate');
	redraw();
	startSelectionListener();
});

eagle.onThemeChanged(() => {
	updateTheme();
});

eagle.onPluginRun(() => {
	console.log('eagle.onPluginRun');
});

eagle.onPluginShow(() => {
	console.log('eagle.onPluginShow');
	startSelectionListener();
});

eagle.onPluginHide(() => {
	console.log('eagle.onPluginHide');
	stopSelectionListener();
});

eagle.onPluginBeforeExit((event) => {
	console.log('eagle.onPluginBeforeExit');
	stopSelectionListener();
});

function setupFieldManagerEvents() {
	const content = document.getElementById('content');
	
	content.querySelector('.add-field-btn').addEventListener('click', () => {
		const inputContainer = document.createElement('div');
		inputContainer.className = 'field-input-container';

		const input = document.createElement('input');
		input.type = 'text';
		input.className = 'field-name-input';
		input.placeholder = 'Enter field name';

		const confirmBtn = document.createElement('button');
		confirmBtn.className = 'confirm-field-btn';
		confirmBtn.textContent = '✓';

		inputContainer.append(input, confirmBtn);
		content.querySelector('.fields-container').appendChild(inputContainer);
	});

	// Event delegation for dynamic elements
	content.addEventListener('click', (e) => {
		if (e.target.classList.contains('remove-field-btn')) {
			e.target.closest('.field-container').remove();
		}
		if (e.target.classList.contains('confirm-field-btn')) {
			const input = e.target.previousElementSibling;
			const fieldName = input.value.trim();
			if (fieldName) {
				const fieldManager = new CustomFieldManager();
				const newField = fieldManager.createField(fieldName);
				const fieldsContainer = content.querySelector('.fields-container');
				fieldsContainer.insertBefore(newField, e.target.closest('.field-input-container'));
				e.target.closest('.field-input-container').remove();
			}
		}
	});
}