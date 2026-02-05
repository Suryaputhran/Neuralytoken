document.addEventListener('DOMContentLoaded', () => {
    const container = document.createElement('div');
    container.id = 'particles-container';
    document.body.prepend(container);

    const particleCount = 20; // Number of particles
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
        createParticle();
    }

    function createParticle() {
        const p = document.createElement('div');
        p.className = 'particle';

        // Random start position
        let x = Math.random() * window.innerWidth;
        let y = Math.random() * window.innerHeight;

        // Random velocity
        let vx = (Math.random() - 0.5) * 0.5;
        let vy = (Math.random() - 0.5) * 0.5;

        // Random size
        const size = Math.random() * 3 + 1;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;

        // Random opacity duration for twinkle
        p.style.animationDuration = `${Math.random() * 3 + 2}s`;

        container.appendChild(p);

        particles.push({ element: p, x, y, vx, vy });
    }

    function animate() {
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            // Bounce off edges
            if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
            if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1;

            p.element.style.transform = `translate(${p.x}px, ${p.y}px)`;
        });
        requestAnimationFrame(animate);
    }

    animate();
});
