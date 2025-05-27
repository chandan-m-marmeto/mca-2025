import { api } from '../app.js';

export class QuestionModal {
    constructor() {
        this.modal = null;
        this.onSave = null;
        this.createModal();
    }

    createModal() {
        // Create modal element
        this.modal = document.createElement('div');
        this.modal.className = 'modal';
        this.modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Create Question</h2>
                    <button class="close-btn">&times;</button>
                </div>
                <form id="question-form" class="modal-form">
                    <div class="form-group">
                        <label for="title">Question Title</label>
                        <input type="text" id="title" name="title" required>
                    </div>
                    <div class="form-group">
                        <label for="description">Description</label>
                        <textarea id="description" name="description" required></textarea>
                    </div>
                    <div class="form-group">
                        <label>Nominees</label>
                        <div id="nominees-list">
                            <div class="nominee-entry">
                                <input type="text" name="nominee-name[]" placeholder="Name" required>
                                <input type="text" name="nominee-department[]" placeholder="Department" required>
                                <button type="button" class="remove-nominee">&times;</button>
                            </div>
                        </div>
                        <button type="button" id="add-nominee" class="btn-secondary">Add Nominee</button>
                    </div>
                    <div class="form-group">
                        <label for="startTime">Start Time</label>
                        <input type="datetime-local" id="startTime" name="startTime" required>
                    </div>
                    <div class="form-group">
                        <label for="endTime">End Time</label>
                        <input type="datetime-local" id="endTime" name="endTime" required>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary cancel-btn">Cancel</button>
                        <button type="submit" class="btn-primary">Save Question</button>
                    </div>
                </form>
            </div>
        `;

        // Add event listeners
        this.modal.querySelector('.close-btn').addEventListener('click', () => this.hide());
        this.modal.querySelector('.cancel-btn').addEventListener('click', () => this.hide());
        this.modal.querySelector('#add-nominee').addEventListener('click', () => this.addNomineeField());
        this.modal.querySelector('#nominees-list').addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-nominee')) {
                e.target.closest('.nominee-entry').remove();
            }
        });

        // Form submission
        this.modal.querySelector('#question-form').addEventListener('submit', (e) => this.handleSubmit(e));

        // Add modal to document
        document.body.appendChild(this.modal);
    }

    show(question = null) {
        this.modal.classList.add('show');
        const form = this.modal.querySelector('#question-form');
        
        if (question) {
            // Edit mode
            this.modal.querySelector('h2').textContent = 'Edit Question';
            form.dataset.questionId = question.id;  // Store question ID in form
            form.title.value = question.title;
            form.description.value = question.description;
            form.startTime.value = new Date(question.startTime).toISOString().slice(0, 16);
            form.endTime.value = new Date(question.endTime).toISOString().slice(0, 16);
            
            // Clear existing nominees
            const nomineesList = this.modal.querySelector('#nominees-list');
            nomineesList.innerHTML = '';
            
            // Add existing nominees
            question.nominees.forEach(nominee => {
                this.addNomineeField(nominee);
            });
        } else {
            // Create mode
            this.modal.querySelector('h2').textContent = 'Create Question';
            form.dataset.questionId = '';  // Clear question ID
            form.reset();
            
            // Set default times
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            form.startTime.value = now.toISOString().slice(0, 16);
            form.endTime.value = tomorrow.toISOString().slice(0, 16);
            
            // Reset nominees
            const nomineesList = this.modal.querySelector('#nominees-list');
            nomineesList.innerHTML = '';
            this.addNomineeField();
        }
    }

    hide() {
        this.modal.classList.remove('show');
    }

    addNomineeField(nominee = null) {
        const nomineeEntry = document.createElement('div');
        nomineeEntry.className = 'nominee-entry';
        nomineeEntry.innerHTML = `
            <input type="text" name="nominee-name[]" placeholder="Name" required value="${nominee?.name || ''}">
            <input type="text" name="nominee-department[]" placeholder="Department" required value="${nominee?.department || ''}">
            <button type="button" class="remove-nominee">&times;</button>
        `;
        
        this.modal.querySelector('#nominees-list').appendChild(nomineeEntry);
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        
        try {
            const formData = new FormData(form);
            const nomineeNames = formData.getAll('nominee-name[]');
            const nomineeDepts = formData.getAll('nominee-department[]');
            
            const data = {
                title: formData.get('title'),
                description: formData.get('description'),
                startTime: new Date(formData.get('startTime')).toISOString(),
                endTime: new Date(formData.get('endTime')).toISOString(),
                nominees: nomineeNames.map((name, i) => ({
                    name,
                    department: nomineeDepts[i]
                }))
            };

            // Get the question ID if we're editing
            const questionId = form.dataset.questionId;
            
            const response = await api.fetch(
                questionId 
                    ? `/api/admin/questions/${questionId}`  // Update existing question
                    : '/api/admin/questions',              // Create new question
                {
                    method: questionId ? 'PUT' : 'POST',
                    body: JSON.stringify(data)
                }
            );
            
            this.hide();
            if (this.onSave) {
                this.onSave(response);
            }
        } catch (error) {
            console.error('Failed to save question:', error);
            alert(error.message || 'Failed to save question');
        } finally {
            submitBtn.disabled = false;
        }
    }

    setOnSave(callback) {
        this.onSave = callback;
    }
} 