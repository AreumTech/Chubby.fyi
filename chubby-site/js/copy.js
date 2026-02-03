/**
 * Copy-to-clipboard functionality for prompt blocks
 */

document.addEventListener('DOMContentLoaded', function() {
  // Handle copy buttons
  const copyButtons = document.querySelectorAll('.copy-btn');

  copyButtons.forEach(button => {
    button.addEventListener('click', async function(e) {
      e.preventDefault();

      const targetId = (this.closest('.prompt-chip') || this.closest('.try-prompt'))?.getAttribute('data-copy');
      const targetElement = document.getElementById(targetId);

      if (!targetElement) {
        console.error('Copy target not found:', targetId);
        return;
      }

      const textToCopy = targetElement.textContent.trim();

      try {
        await navigator.clipboard.writeText(textToCopy);

        // Visual feedback
        this.classList.add('copied');

        // Reset after 0.8 seconds
        setTimeout(() => {
          this.classList.remove('copied');
        }, 800);

      } catch (err) {
        console.error('Failed to copy:', err);

        // Fallback for older browsers
        fallbackCopy(textToCopy, this);
      }
    });
  });
});

/**
 * Fallback copy method for browsers without clipboard API
 */
function fallbackCopy(text, button) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.top = '-9999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    if (successful) {
      button.classList.add('copied');

      setTimeout(() => {
        button.classList.remove('copied');
      }, 800);
    }
  } catch (err) {
    console.error('Fallback copy failed:', err);
  }

  document.body.removeChild(textArea);
}
