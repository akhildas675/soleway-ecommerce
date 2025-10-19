async function toggleBlockUnblock(userId, button) {
    let isBlocking = button.textContent.trim() === 'Block';
    let url = isBlocking ? '/admin/blockUser' : '/admin/unBlockUser';
    
    // Disable button during request
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = isBlocking ? 'Blocking...' : 'Unblocking...';
    
    try {
        const response = await fetch(url + '?id=' + userId, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Update button and status based on the action performed
            if (isBlocking) {
                button.textContent = 'Unblock';
                button.classList.remove('btn-danger');
                button.classList.add('btn-success');
                
                let statusBadge = button.closest('tr').querySelector('.badge');
                statusBadge.textContent = 'Inactive';
                statusBadge.classList.remove('alert-success');
                statusBadge.classList.add('alert-danger');
            } else {
                button.textContent = 'Block';
                button.classList.remove('btn-success');
                button.classList.add('btn-danger');
                
                let statusBadge = button.closest('tr').querySelector('.badge');
                statusBadge.textContent = 'Active';
                statusBadge.classList.remove('alert-danger');
                statusBadge.classList.add('alert-success');
            }
            
            // Show success message (optional)
            // alert(result.message);
        } else {
            // Handle error response
            console.error('Server error:', result.message);
            alert('Error: ' + (result.message || 'Failed to toggle user status'));
            
            // Restore button state
            button.textContent = originalText;
        }
    } catch (error) {
        console.error('Network error:', error);
        alert('Network error occurred. Please try again.');
        
        // Restore button state
        button.textContent = originalText;
    } finally {
        // Re-enable button
        button.disabled = false;
    }
}