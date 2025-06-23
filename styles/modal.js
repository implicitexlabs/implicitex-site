// Modal open/close logic
function openModal(contentHtml) {
    document.getElementById('modal-content').innerHTML = contentHtml;
    document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
}

document.getElementById('modal-close').onclick = closeModal;
document.getElementById('modal-overlay').onclick = function(e) {
    if (e.target === this) closeModal();
};

// Example: open the modal when the page loads
// openMOdal('<h2>Hello!</h2><p>This modal appears when the page loads.<p>');