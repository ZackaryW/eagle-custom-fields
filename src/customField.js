class CustomFieldManager {
    constructor(onFieldChange = null, existingFields = null) {
        this.fieldCounter = 0;
        this.onFieldChange = onFieldChange;
        this.debounceTimeout = null;
        this.existingFields = existingFields || {};
    }

    debounce(callback, delay = 500) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
            callback();
        }, delay);
    }

    createField(fieldName) {
        const fieldId = `field-${this.fieldCounter++}`;
        const fieldContainer = document.createElement('div');
        fieldContainer.className = 'field-container';
        fieldContainer.id = fieldId;

        const label = document.createElement('label');
        label.className = 'field-label';
        label.textContent = fieldName;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'field-input';
        
        // Add input change listener if callback is set
        if (this.onFieldChange) {
            input.addEventListener('change', () => {
                this.onFieldChange(CustomFieldManager.getFieldsData());
            });
            
            input.addEventListener('input', () => {
                this.debounce(() => {
                    this.onFieldChange(CustomFieldManager.getFieldsData());
                });
            });
        }

        // Handle tab key on field input
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                // If it's the last input in the list, focus the add button
                const allInputs = document.querySelectorAll('.field-input');
                const lastInput = allInputs[allInputs.length - 1];
                if (input === lastInput) {
                    e.preventDefault();
                    document.querySelector('.add-field-btn').focus();
                }
            }
        });

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-field-btn';
        removeBtn.textContent = '-';

        fieldContainer.append(label, input, removeBtn);
        return fieldContainer;
    }

    createFieldInput() {
        const inputContainer = document.createElement('div');
        inputContainer.className = 'field-input-container';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'field-name-input';
        input.placeholder = 'Enter field name';
        
        // Add datalist for autocomplete
        const datalist = document.createElement('datalist');
        const datalistId = `field-suggestions-${this.fieldCounter}`;
        datalist.id = datalistId;
        
        // Get existing entries from db and populate datalist
        const entries = db.get('entries') || [];
        entries.forEach(entry => {
            const option = document.createElement('option');
            option.value = entry;
            datalist.appendChild(option);
        });
        
        input.setAttribute('list', datalistId);
        inputContainer.appendChild(datalist);

        // Handle tab key on new field input
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                if (!input.value.trim()) {
                    inputContainer.remove();
                    document.querySelector('.add-field-btn').focus();
                } else {
                    // Create the field and focus its value input
                    const confirmBtn = input.nextElementSibling;
                    const newField = this.confirmField(confirmBtn);
                    if (newField) {
                        newField.querySelector('.field-input').focus();
                    }
                }
            }
        });

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'confirm-field-btn';
        confirmBtn.textContent = '✓';

        inputContainer.append(input, confirmBtn);
        return inputContainer;
    }

    isFieldNameTaken(fieldName) {
        const existingLabels = Array.from(document.querySelectorAll('.field-label'))
            .map(label => label.textContent);
        return existingLabels.includes(fieldName);
    }

    createContainer() {
        const container = document.createElement('div');
        container.className = 'field-manager';

        const fieldsContainer = document.createElement('div');
        fieldsContainer.className = 'fields-container';

        // Populate existing fields if available
        Object.entries(this.existingFields).forEach(([fieldName, fieldValue]) => {
            const field = this.createField(fieldName);
            const input = field.querySelector('.field-input');
            input.value = fieldValue;
            fieldsContainer.appendChild(field);
        });

        const addButton = document.createElement('button');
        addButton.className = 'add-field-btn';
        addButton.textContent = '+';

        // Handle tab key on add button
        addButton.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const firstInput = container.querySelector('.field-input');
                if (firstInput) {
                    e.preventDefault();
                    firstInput.focus();
                }
            }
        });

        const addNewField = () => {
            const inputContainer = this.createFieldInput();
            fieldsContainer.appendChild(inputContainer);
            // Focus the new input
            inputContainer.querySelector('.field-name-input').focus();
        };

        // Add event listeners
        addButton.addEventListener('click', addNewField);

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Check if '+' is pressed and no input is focused
            if (e.key === '+' && document.activeElement.tagName !== 'INPUT') {
                e.preventDefault();
                addNewField();
            }
        });

        fieldsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-field-btn')) {
                e.target.closest('.field-container').remove();
                if (this.onFieldChange) {
                    this.onFieldChange(CustomFieldManager.getFieldsData());
                }
            }
            if (e.target.classList.contains('confirm-field-btn')) {
                this.confirmField(e.target);
            }
        });

        // Add keyboard listener for enter key on input fields
        fieldsContainer.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && 
                e.target.classList.contains('field-name-input')) {
                e.preventDefault();
                const confirmBtn = e.target.nextElementSibling;
                this.confirmField(confirmBtn);
            }
        });

        container.append(fieldsContainer, addButton);
        return container;
    }

    confirmField(confirmButton) {
        const input = confirmButton.previousElementSibling;
        const fieldName = input.value.trim();
        const inputContainer = confirmButton.closest('.field-input-container');

        if (!fieldName) {
            return null;
        }

        if (this.isFieldNameTaken(fieldName)) {
            input.classList.add('error');
            setTimeout(() => input.classList.remove('error'), 500);
            return null;
        }

        // Add the field name to db entries
        db.append('entries', fieldName);

        const newField = this.createField(fieldName);
        inputContainer.parentNode.insertBefore(newField, inputContainer);
        inputContainer.remove();
        
        if (this.onFieldChange) {
            this.onFieldChange(CustomFieldManager.getFieldsData());
        }

        return newField; // Return the new field element
    }

    static getFieldsData() {
        const fieldData = {};
        document.querySelectorAll('.field-container').forEach(container => {
            const label = container.querySelector('.field-label').textContent;
            const value = container.querySelector('.field-input').value;
            fieldData[label] = value;
        });
        return fieldData;
    }
}

module.exports = {CustomFieldManager};