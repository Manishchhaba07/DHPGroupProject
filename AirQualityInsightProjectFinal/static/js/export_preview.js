document.addEventListener('DOMContentLoaded', function() {
    // Set up light mode toggle
    const toggleButton = document.getElementById('light-mode-toggle');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleLightMode);
    }
    
    // Set up preview buttons
    const previewButtons = document.querySelectorAll('.preview-button');
    previewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const fileUrl = this.getAttribute('data-file');
            previewFile(fileUrl);
        });
    });
    
    // Close preview when clicking close button
    const closeButton = document.getElementById('close-preview');
    if (closeButton) {
        closeButton.addEventListener('click', closePreview);
    }
});

function toggleLightMode() {
    document.body.classList.toggle('light-mode');
    
    // Update button text
    const button = document.getElementById('light-mode-toggle');
    if (button) {
        const currentMode = document.body.classList.contains('light-mode') ? 'Dark' : 'Light';
        button.textContent = `Switch to ${currentMode} Mode`;
    }
}

function previewFile(fileUrl) {
    const previewContainer = document.getElementById('file-preview-container');
    const previewContent = document.getElementById('preview-content');
    
    if (previewContainer && previewContent) {
        // Show the preview container
        previewContainer.style.display = 'flex';
        
        // Clear previous content
        previewContent.innerHTML = '';
        
        // Set preview title
        document.getElementById('preview-title').textContent = fileUrl.split('/').pop();
        
        // Handle different file types
        const fileExtension = fileUrl.split('.').pop().toLowerCase();
        
        if (fileExtension === 'csv') {
            // For CSV files, fetch and display as table
            fetch(fileUrl)
                .then(response => response.text())
                .then(data => {
                    const rows = data.split('\n');
                    const table = document.createElement('table');
                    table.classList.add('preview-table');
                    
                    rows.forEach((row, index) => {
                        if (row.trim() === '') return;
                        
                        const tr = document.createElement('tr');
                        const cells = row.split(',');
                        
                        cells.forEach(cell => {
                            const td = document.createElement(index === 0 ? 'th' : 'td');
                            td.textContent = cell.trim();
                            tr.appendChild(td);
                        });
                        
                        table.appendChild(tr);
                    });
                    
                    previewContent.appendChild(table);
                })
                .catch(error => {
                    previewContent.innerHTML = `<div class="error-message">Error loading file: ${error.message}</div>`;
                });
        } else if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(fileExtension)) {
            // For image files
            const img = document.createElement('img');
            img.src = fileUrl;
            img.alt = 'Preview image';
            img.classList.add('preview-image');
            previewContent.appendChild(img);
        } else if (['json'].includes(fileExtension)) {
            // For JSON files
            fetch(fileUrl)
                .then(response => response.json())
                .then(data => {
                    const pre = document.createElement('pre');
                    pre.textContent = JSON.stringify(data, null, 2);
                    pre.classList.add('json-preview');
                    previewContent.appendChild(pre);
                })
                .catch(error => {
                    previewContent.innerHTML = `<div class="error-message">Error loading file: ${error.message}</div>`;
                });
        } else {
            // For other file types
            previewContent.innerHTML = `<div class="unsupported-message">Preview not available for ${fileExtension} files. Please download to view.</div>`;
        }
    }
}

function closePreview() {
    const previewContainer = document.getElementById('file-preview-container');
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
}