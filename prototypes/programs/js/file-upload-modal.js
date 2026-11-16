/**
 * File Upload Modal Module
 * Handles file upload modal interactions
 */

(function() {
    'use strict';

    let currentPCNId = null;
    let selectedFile = null;

    window.FileUploadModal = {
        init: function() {
            if (window.ModalShell) {
                window.ModalShell.render({
                    modalId: 'file-upload-modal',
                    sizeClass: '',
                    title: 'Upload Justification File',
                    closeId: 'close-file-modal',
                    bodyHtml: window.ModalShell.bodyFrom('file-upload-modal-body'),
                    footerHtml: window.ModalShell.bodyFrom('file-upload-modal-footer')
                });
            }
            this.attachEventListeners();
        },

        open: function(pcnId) {
            currentPCNId = pcnId;
            selectedFile = null;
            this.resetModal();
            
            const modal = document.getElementById('file-upload-modal');
            if (modal) {
                modal.classList.add('modal-overlay--open');
            }
        },

        close: function() {
            const modal = document.getElementById('file-upload-modal');
            if (modal) {
                modal.classList.remove('modal-overlay--open');
            }
            currentPCNId = null;
            selectedFile = null;
            this.resetModal();
        },

        resetModal: function() {
            const fileInput = document.getElementById('file-input');
            const fileSelectedInfo = document.getElementById('file-selected-info');
            const uploadBtn = document.getElementById('upload-file-btn');
            
            if (fileInput) fileInput.value = '';
            if (fileSelectedInfo) fileSelectedInfo.style.display = 'none';
            if (uploadBtn) uploadBtn.disabled = true;
        },

        attachEventListeners: function() {
            // Close button
            const closeBtn = document.getElementById('close-file-modal');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.close());
            }

            // Cancel button
            const cancelBtn = document.getElementById('cancel-upload-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.close());
            }

            // Browse files button
            const browseBtn = document.getElementById('browse-file-btn');
            const fileInput = document.getElementById('file-input');
            if (browseBtn && fileInput) {
                browseBtn.addEventListener('click', () => {
                    fileInput.click();
                });
            }

            // File input change
            if (fileInput) {
                fileInput.addEventListener('change', (e) => {
                    if (e.target.files.length > 0) {
                        this.handleFileSelect(e.target.files[0]);
                    }
                });
            }

            // Drag and drop
            const uploadArea = document.getElementById('file-upload-area');
            if (uploadArea) {
                uploadArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    uploadArea.classList.add('drag-over');
                });

                uploadArea.addEventListener('dragleave', () => {
                    uploadArea.classList.remove('drag-over');
                });

                uploadArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    uploadArea.classList.remove('drag-over');
                    
                    if (e.dataTransfer.files.length > 0) {
                        this.handleFileSelect(e.dataTransfer.files[0]);
                    }
                });

                // Click to browse
                uploadArea.addEventListener('click', (e) => {
                    if (e.target === uploadArea || e.target.closest('p')) {
                        fileInput.click();
                    }
                });
            }

            // Remove file button
            const removeBtn = document.getElementById('remove-file-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    this.removeFile();
                });
            }

            // Upload button
            const uploadBtn = document.getElementById('upload-file-btn');
            if (uploadBtn) {
                uploadBtn.addEventListener('click', () => {
                    this.uploadFile();
                });
            }

            // Close on overlay click
            const modal = document.getElementById('file-upload-modal');
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.close();
                    }
                });
            }
        },

        handleFileSelect: function(file) {
            // Validate file type
            const allowedTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'image/png',
                'image/jpeg',
                'image/jpg'
            ];

            if (!allowedTypes.includes(file.type)) {
                if (typeof showNotification === 'function') {
                    showNotification('error', 'Invalid file type. Please upload PDF, DOC, DOCX, XLS, XLSX, PNG, or JPG files.');
                }
                return;
            }

            // Validate file size (max 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB in bytes
            if (file.size > maxSize) {
                if (typeof showNotification === 'function') {
                    showNotification('error', 'File size exceeds 10MB limit.');
                }
                return;
            }

            selectedFile = file;
            this.displayFileInfo(file);
        },

        displayFileInfo: function(file) {
            const fileSelectedInfo = document.getElementById('file-selected-info');
            const fileName = document.getElementById('file-name');
            const fileSize = document.getElementById('file-size');
            const uploadBtn = document.getElementById('upload-file-btn');

            if (fileName) fileName.textContent = file.name;
            if (fileSize) fileSize.textContent = this.formatFileSize(file.size);
            if (fileSelectedInfo) fileSelectedInfo.style.display = 'block';
            if (uploadBtn) uploadBtn.disabled = false;
        },

        removeFile: function() {
            selectedFile = null;
            const fileInput = document.getElementById('file-input');
            const fileSelectedInfo = document.getElementById('file-selected-info');
            const uploadBtn = document.getElementById('upload-file-btn');

            if (fileInput) fileInput.value = '';
            if (fileSelectedInfo) fileSelectedInfo.style.display = 'none';
            if (uploadBtn) uploadBtn.disabled = true;
        },

        uploadFile: function() {
            if (!selectedFile || !currentPCNId) return;

            console.log('Uploading file:', selectedFile.name, 'for PCR:', currentPCNId);

            // Simulate upload
            if (typeof showNotification === 'function') {
                showNotification('success', `File "${selectedFile.name}" uploaded successfully`);
            }

            // Update PCN table with file name
            if (window.PCNRowActions) {
                window.PCNRowActions.updateFileLink(currentPCNId, selectedFile.name);
            }

            // Close modal
            this.close();
        },

        formatFileSize: function(bytes) {
            if (bytes === 0) return '0 Bytes';
            
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
        }
    };
})();
