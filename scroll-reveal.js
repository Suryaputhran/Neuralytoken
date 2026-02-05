// Simple Scroll Reveal Script
document.addEventListener('DOMContentLoaded', () => {
    const options = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, options);

    // Target elements with .reveal class
    document.querySelectorAll('.reveal').forEach(el => {
        observer.observe(el);
    });
});
