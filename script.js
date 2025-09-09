// Form submission handling
document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.registration-form');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            
            // Simple validation
            const requiredFields = ['nombre', 'apellidos', 'telefono', 'correo'];
            let isValid = true;
            
            requiredFields.forEach(field => {
                const input = form.querySelector(`[name="${field}"]`);
                if (!input || !input.value.trim()) {
                    isValid = false;
                    input.style.borderColor = '#ff6b9d';
                    input.style.boxShadow = '0 0 0 2px rgba(255, 107, 157, 0.3)';
                    
                    // Reset styling after 3 seconds
                    setTimeout(() => {
                        input.style.borderColor = '';
                        input.style.boxShadow = '';
                    }, 3000);
                }
            });
            
            if (isValid) {
                // Show loading state
                const submitBtn = form.querySelector('.submit-btn');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
                submitBtn.disabled = true;
                
                try {
                    
                    // Prepare data for API
                    const apiData = {
                        firstName: data.nombre,
                        lastName: data.apellidos,
                        email: data.correo,
                        phone: data.telefono
                    };
                    
                    // Send to API
                    const response = await fetch('https://filavirtual2.debmedia.com/api/v1/queue/12083/branch/10618/enqueue', {
                        method: 'POST',
                        headers: {
                            'x-api-token': 'iyAUHKKJ2NTsxf4sAH1OWm3fljRsThvxF0kbCGWe',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(apiData)
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        
                        // Extract required data
                        const extractedData = {
                            videoCallUrl: result.videoCallUrl + '?videocallUser=mobile',
                            turn: result.jsonDetails.turn,
                            averageWaitingTime: result.jsonDetails.averageWaitingTime,
                            code: result.code,
                            estado: 'En espera'
                        };
                        
                        // Show success with extracted data
                        showSuccessWithDataMobile(extractedData);
                        form.reset();
                    } else {
                        throw new Error('Error en la API');
                    }
                    
                } catch (error) {
                    console.error('Error:', error);
                    showNotification('Error al enviar los datos. Por favor, intenta nuevamente.', 'error');
                } finally {
                    // Reset button state
                    const submitBtn = form.querySelector('.submit-btn');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            } else {
                showNotification('Por favor, completa todos los campos requeridos.', 'error');
            }
        });
    }
});

// Global variables for turn monitoring
let turnCode = null;
let monitoringInterval = null;
let currentVideoCallUrl = null;

// Show success with extracted data (Mobile Interface)
function showSuccessWithDataMobile(data) {
    // Store data for monitoring
    turnCode = data.code;
    currentVideoCallUrl = data.videoCallUrl;
    
    // Show the turn info section
    const turnInfoSection = document.getElementById('turn-info');
    turnInfoSection.style.display = 'block';
    
    // Update the data
    document.getElementById('turn-number').textContent = data.turn;
    document.getElementById('turn-code').textContent = data.code;
    document.getElementById('waiting-time').textContent = Math.round(data.averageWaitingTime) + ' minutos';
    
    // Start monitoring
    startTurnMonitoringMobile();
    
    // Add event listeners
    setupMobileEventListeners();
}

// Setup event listeners for mobile interface
function setupMobileEventListeners() {
    // Copy URL button
    const copyBtn = document.getElementById('copy-url-btn');
    copyBtn.addEventListener('click', () => {
        if (currentVideoCallUrl) {
            navigator.clipboard.writeText(currentVideoCallUrl).then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
                copyBtn.style.background = '#10b981';
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.style.background = '#6b7280';
                }, 2000);
            });
        }
    });
    
    // New registration button
    const newRegBtn = document.getElementById('new-registration-btn');
    newRegBtn.addEventListener('click', () => {
        // Hide turn info section
        document.getElementById('turn-info').style.display = 'none';
        
        // Stop monitoring
        stopTurnMonitoring();
        
        // Reset form
        document.querySelector('.registration-form').reset();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Start monitoring turn status (Mobile)
function startTurnMonitoringMobile() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
    }
    
    monitoringInterval = setInterval(async () => {
        try {
            const response = await fetch(`https://filavirtual2.debmedia.com/api/v1/turn/code/${turnCode}`, {
                method: 'GET',
                headers: {
                    'x-api-token': 'iyAUHKKJ2NTsxf4sAH1OWm3fljRsThvxF0kbCGWe'
                }
            });
            
            if (response.ok) {
                const turnData = await response.json();
                updateTurnDataMobile(turnData);
            }
        } catch (error) {
            console.error('Error checking turn status:', error);
        }
    }, 3000); // Check every 3 seconds
}

// Update turn data in mobile interface
function updateTurnDataMobile(turnData) {
    // Update average waiting time
    const avgTime = turnData.jsonDetails?.averageWaitingTime || 0;
    document.getElementById('waiting-time').textContent = Math.round(avgTime) + ' minutos';
    
    // Update status
    const statusText = document.querySelector('.status-text');
    const statusIndicator = document.querySelector('.status-indicator');
    const newStatus = turnData.jsonDetails?.status || 'En espera';
    
    // Only update if status is not "WAITING_TO_BE_CALLED"
    if (newStatus !== 'WAITING_TO_BE_CALLED') {
        if (newStatus === 'ANNOUNCED') {
            statusText.textContent = 'Lo estamos llamando';
            statusIndicator.style.background = '#10b981';
            
            // Show video call section
            showVideoCallMobile(turnData.videoCallUrl + '?videocallUser=mobile');
        } else {
            statusText.textContent = newStatus;
            
            // Change color based on status
            if (newStatus === 'CALLING' || newStatus === 'IN_CALL') {
                statusIndicator.style.background = '#10b981'; // Green
            } else if (newStatus === 'COMPLETED' || newStatus === 'FINISHED') {
                statusIndicator.style.background = '#6b7280'; // Gray
            } else {
                statusIndicator.style.background = '#f59e0b'; // Orange
            }
        }
    }
}

// Show video call section in mobile interface
function showVideoCallMobile(videoCallUrl) {
    const videoCallSection = document.getElementById('video-call-section');
    const videoCallLink = document.getElementById('video-call-link');
    
    // Update URL
    videoCallLink.href = videoCallUrl;
    currentVideoCallUrl = videoCallUrl;
    
    // Show section
    videoCallSection.style.display = 'block';
    
    // Scroll to video call section
    videoCallSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Show success with extracted data
function showSuccessWithData(data) {
    // Remove existing modals
    const existingModal = document.querySelector('.data-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Store turn code for monitoring
    turnCode = data.code;
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'data-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>¡Registro Exitoso!</h3>
                <button class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="data-item">
                    <strong>Turno:</strong> ${data.turn}
                </div>
                <div class="data-item">
                    <strong>Código:</strong> ${data.code}
                </div>
                <div class="data-item">
                    <strong>Estado:</strong> <span class="status">${data.estado}</span>
                </div>
                <div class="data-item">
                    <strong>Tiempo de espera promedio:</strong> ${Math.round(data.averageWaitingTime)} minutos
                </div>
                <div class="data-item">
                    <strong>URL de videollamada:</strong> 
                    <a href="${data.videoCallUrl}" target="_blank" class="video-link">
                        ${data.videoCallUrl}
                    </a>
                </div>
                <div class="modal-actions">
                    <button class="btn-primary copy-btn" data-url="${data.videoCallUrl}">
                        <i class="fas fa-copy"></i> Copiar URL
                    </button>
                    <button class="btn-secondary close-modal-btn">Cerrar</button>
                </div>
            </div>
        </div>
    `;
    
    // Add styles
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    // Add modal styles
    const style = document.createElement('style');
    style.textContent = `
        .modal-content {
            background: white;
            border-radius: 15px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            animation: slideIn 0.3s ease;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .modal-header h3 {
            margin: 0;
            color: #1f2937;
            font-size: 1.5rem;
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #6b7280;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .data-item {
            margin-bottom: 15px;
            padding: 10px;
            background: #f9fafb;
            border-radius: 8px;
            border-left: 4px solid #32ff32;
        }
        
        .data-item strong {
            color: #1f2937;
            display: block;
            margin-bottom: 5px;
        }
        
        .data-item {
            color: #000000;
        }
        
        .status {
            color: #f59e0b;
            font-weight: 600;
        }
        
        .video-link {
            color: #2563eb;
            text-decoration: none;
            word-break: break-all;
        }
        
        .video-link:hover {
            text-decoration: underline;
        }
        
        .modal-actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        
        .copy-btn, .close-modal-btn {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        
        .copy-btn {
            background: #32ff32;
            color: #000000;
        }
        
        .copy-btn:hover {
            background: #28e028;
        }
        
        .close-modal-btn {
            background: #6b7280;
            color: white;
        }
        
        .close-modal-btn:hover {
            background: #4b5563;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Add to page
    document.body.appendChild(modal);
    
    // Close modal events
    modal.querySelector('.close-btn').addEventListener('click', () => {
        stopTurnMonitoring();
        modal.remove();
        style.remove();
    });
    
    modal.querySelector('.close-modal-btn').addEventListener('click', () => {
        stopTurnMonitoring();
        modal.remove();
        style.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            stopTurnMonitoring();
            modal.remove();
            style.remove();
        }
    });
    
    // Copy URL functionality
    modal.querySelector('.copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(data.videoCallUrl).then(() => {
            const btn = modal.querySelector('.copy-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
            btn.style.background = '#10b981';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '#32ff32';
            }, 2000);
        });
    });
    
    // Start monitoring the turn
    startTurnMonitoring(modal);
}

// Start monitoring turn status
function startTurnMonitoring(modal) {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
    }
    
    monitoringInterval = setInterval(async () => {
        try {
            const response = await fetch(`https://filavirtual2.debmedia.com/api/v1/turn/code/${turnCode}`, {
                method: 'GET',
                headers: {
                    'x-api-token': 'iyAUHKKJ2NTsxf4sAH1OWm3fljRsThvxF0kbCGWe'
                }
            });
            
            if (response.ok) {
                const turnData = await response.json();
                updateTurnData(modal, turnData);
            }
        } catch (error) {
            console.error('Error checking turn status:', error);
        }
    }, 3000); // Check every 3 seconds
}

// Update turn data in modal
function updateTurnData(modal, turnData) {
    // Find the data items in the modal
    const dataItems = modal.querySelectorAll('.data-item');
    
    dataItems.forEach(item => {
        const strong = item.querySelector('strong');
        if (strong) {
            const label = strong.textContent.trim();
            
            // Update average waiting time
            if (label === 'Tiempo de espera promedio:') {
                const avgTime = turnData.jsonDetails?.averageWaitingTime || 0;
                item.innerHTML = `<strong>Tiempo de espera promedio:</strong> ${Math.round(avgTime)} minutos`;
            }
            
            // Update status only if it's not "WAITING_TO_BE_CALLED"
            if (label === 'Estado:') {
                const currentStatus = item.querySelector('.status');
                if (currentStatus) {
                    const newStatus = turnData.jsonDetails?.status || 'En espera';
                    
                    // Only update if status is not "WAITING_TO_BE_CALLED"
                    if (newStatus !== 'WAITING_TO_BE_CALLED') {
                        // Special handling for ANNOUNCED status
                        if (newStatus === 'ANNOUNCED') {
                            currentStatus.textContent = 'Lo estamos llamando';
                            currentStatus.style.color = '#10b981'; // Green
                            
                            // Show video call URL when status is ANNOUNCED
                            showVideoCallUrl(modal, turnData.videoCallUrl + '?videocallUser=mobile');
                        } else {
                            currentStatus.textContent = newStatus;
                            
                            // Change color based on status
                            if (newStatus === 'CALLING' || newStatus === 'IN_CALL') {
                                currentStatus.style.color = '#10b981'; // Green
                            } else if (newStatus === 'COMPLETED' || newStatus === 'FINISHED') {
                                currentStatus.style.color = '#6b7280'; // Gray
                            } else {
                                currentStatus.style.color = '#f59e0b'; // Orange
                            }
                        }
                    }
                }
            }
        }
    });
}

// Show video call URL when status is ANNOUNCED
function showVideoCallUrl(modal, videoCallUrl) {
    // Check if video call URL section already exists
    let videoCallSection = modal.querySelector('.video-call-section');
    
    if (!videoCallSection) {
        // Create video call section
        videoCallSection = document.createElement('div');
        videoCallSection.className = 'video-call-section';
        videoCallSection.innerHTML = `
            <div class="video-call-notification">
                <div class="notification-icon">
                    <i class="fas fa-video"></i>
                </div>
                <div class="notification-content">
                    <h4>¡Es tu turno!</h4>
                    <p>Conéctate a la videollamada haciendo clic en el enlace:</p>
                    <a href="${videoCallUrl}" target="_blank" class="video-call-link">
                        <i class="fas fa-external-link-alt"></i>
                        Conectar a videollamada
                    </a>
                </div>
            </div>
        `;
        
        // Add styles for video call section
        const style = document.createElement('style');
        style.textContent = `
            .video-call-section {
                margin-top: 20px;
                animation: slideInUp 0.5s ease;
            }
            
            .video-call-notification {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                padding: 20px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                gap: 15px;
                box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
            }
            
            .notification-icon {
                font-size: 2rem;
                color: white;
            }
            
            .notification-content h4 {
                margin: 0 0 8px 0;
                font-size: 1.2rem;
                font-weight: 600;
            }
            
            .notification-content p {
                margin: 0 0 12px 0;
                opacity: 0.9;
            }
            
            .video-call-link {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: rgba(255, 255, 255, 0.2);
                color: white;
                padding: 10px 16px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 600;
                transition: all 0.3s ease;
                border: 2px solid rgba(255, 255, 255, 0.3);
            }
            
            .video-call-link:hover {
                background: rgba(255, 255, 255, 0.3);
                border-color: rgba(255, 255, 255, 0.5);
                transform: translateY(-2px);
            }
            
            @keyframes slideInUp {
                from {
                    transform: translateY(20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Insert after the last data item
        const modalBody = modal.querySelector('.modal-body');
        const lastDataItem = modalBody.querySelector('.data-item:last-of-type');
        lastDataItem.parentNode.insertBefore(videoCallSection, lastDataItem.nextSibling);
    } else {
        // Update existing video call URL
        const videoCallLink = videoCallSection.querySelector('.video-call-link');
        if (videoCallLink) {
            videoCallLink.href = videoCallUrl;
        }
    }
}

// Stop monitoring when modal is closed
function stopTurnMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#32ff32' : '#ff6b9d'};
        color: ${type === 'success' ? '#000000' : '#ffffff'};
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        font-weight: 500;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Input focus effects
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', function() {
        this.style.borderColor = '#4ecdc4';
        this.style.boxShadow = '0 0 0 2px rgba(78, 205, 196, 0.3)';
    });
    
    input.addEventListener('blur', function() {
        this.style.borderColor = '';
        this.style.boxShadow = '';
    });
});

// Button click effect
const submitBtn = document.querySelector('.submit-btn');
if (submitBtn) {
    submitBtn.addEventListener('click', function(e) {
        // Create ripple effect
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;
        
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
}

// Add ripple animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);