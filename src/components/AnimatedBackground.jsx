import React, { useEffect, useRef } from 'react';

const AnimatedBackground = ({ className = "" }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Set canvas size and handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Brand colors from ConnectifyLogo
    const brandColors = {
      primary: '#0ea5e9',
      secondary: '#3b82f6',
      accent1: '#38bdf8',
      accent2: '#60a5fa',
      darkBlue: '#0284c7'
    };

    // Audio wave-like visualization (Spotify-inspired)
    class AudioWave {
      constructor() {
        this.bars = [];
        this.totalBars = Math.floor(canvas.width / 12);
        this.minHeight = canvas.height * 0.02;
        this.maxHeight = canvas.height * 0.08;
        this.verticalPosition = canvas.height * 0.75; // Moved lower on screen

        // Initialize bars
        for (let i = 0; i < this.totalBars; i++) {
          this.bars.push({
            x: i * 12,
            height: this.minHeight + Math.random() * (this.maxHeight - this.minHeight),
            speed: 0.1 + Math.random() * 0.2,
            direction: Math.random() > 0.5 ? 1 : -1
          });
        }
      }

      update() {
        this.bars.forEach(bar => {
          bar.height += bar.speed * bar.direction;

          if (bar.height >= this.maxHeight || bar.height <= this.minHeight) {
            bar.direction *= -1;
          }
        });
      }

      draw() {
        ctx.beginPath();

        // Create gradient for the wave
        const gradient = ctx.createLinearGradient(0, this.verticalPosition - this.maxHeight, 0, this.verticalPosition);
        gradient.addColorStop(0, brandColors.accent1);
        gradient.addColorStop(1, brandColors.primary);

        ctx.fillStyle = gradient;
        ctx.moveTo(0, this.verticalPosition);

        // Draw curvy path connecting bar tops
        for (let i = 0; i < this.bars.length; i++) {
          const bar = this.bars[i];

          if (i === 0) {
            ctx.lineTo(bar.x, this.verticalPosition - bar.height);
          } else {
            const prevBar = this.bars[i - 1];
            const cpx = (prevBar.x + bar.x) / 2;
            const cpy = this.verticalPosition - (prevBar.height + bar.height) / 2;
            ctx.quadraticCurveTo(cpx, cpy, bar.x, this.verticalPosition - bar.height);
          }
        }

        // Complete the path
        ctx.lineTo(canvas.width, this.verticalPosition);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Vertical scrolling cards (TikTok-inspired)
    class ScrollingCards {
      constructor() {
        this.cards = [];
        this.totalCards = 12; // Increased card count

        // Create initial cards
        for (let i = 0; i < this.totalCards; i++) {
          this.addCard();
        }
      }

      addCard() {
        const width = 70 + Math.random() * 150;
        const height = 100 + Math.random() * 200;
        const x = Math.random() * (canvas.width - width);
        const y = canvas.height + height + (Math.random() * 500);

        this.cards.push({
          x,
          y,
          width,
          height,
          opacity: 0.05 + Math.random() * 0.15,
          speed: 1 + Math.random() * 2,
          color: Object.values(brandColors)[Math.floor(Math.random() * Object.values(brandColors).length)]
        });
      }

      update() {
        // Update card positions
        for (let i = this.cards.length - 1; i >= 0; i--) {
          const card = this.cards[i];
          card.y -= card.speed;

          // Remove cards that have gone off screen and add new ones
          if (card.y + card.height < 0) {
            this.cards.splice(i, 1);
            this.addCard();
          }
        }
      }

      draw() {
        this.cards.forEach(card => {
          ctx.globalAlpha = card.opacity;
          ctx.fillStyle = card.color;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;

          // Draw rounded rectangle
          ctx.beginPath();
          const radius = 10;
          ctx.moveTo(card.x + radius, card.y);
          ctx.lineTo(card.x + card.width - radius, card.y);
          ctx.quadraticCurveTo(card.x + card.width, card.y, card.x + card.width, card.y + radius);
          ctx.lineTo(card.x + card.width, card.y + card.height - radius);
          ctx.quadraticCurveTo(card.x + card.width, card.y + card.height, card.x + card.width - radius, card.y + card.height);
          ctx.lineTo(card.x + radius, card.y + card.height);
          ctx.quadraticCurveTo(card.x, card.y + card.height, card.x, card.y + card.height - radius);
          ctx.lineTo(card.x, card.y + radius);
          ctx.quadraticCurveTo(card.x, card.y, card.x + radius, card.y);
          ctx.closePath();

          ctx.fill();
          ctx.stroke();

          // Add some minimal content lines
          ctx.beginPath();
          ctx.moveTo(card.x + 15, card.y + 30);
          ctx.lineTo(card.x + card.width - 15, card.y + 30);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(card.x + 15, card.y + 50);
          ctx.lineTo(card.x + card.width * 0.6, card.y + 50);
          ctx.stroke();
        });

        ctx.globalAlpha = 1;
      }
    }

    // Network nodes (ConnectifAI brand element)
    class NetworkNodes {
      constructor() {
        this.nodes = [];
        this.totalNodes = 35; // Increased node count

        // Initialize nodes
        for (let i = 0; i < this.totalNodes; i++) {
          this.nodes.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: 2 + Math.random() * 4,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            color: Object.values(brandColors)[Math.floor(Math.random() * Object.values(brandColors).length)]
          });
        }
      }

      update() {
        this.nodes.forEach(node => {
          // Update position
          node.x += node.speedX;
          node.y += node.speedY;

          // Boundary check with bounce
          if (node.x < 0 || node.x > canvas.width) {
            node.speedX *= -1;
          }

          if (node.y < 0 || node.y > canvas.height) {
            node.speedY *= -1;
          }
        });
      }

      drawConnections() {
        // Draw connections between nearby nodes
        ctx.lineWidth = 0.5;

        for (let i = 0; i < this.nodes.length; i++) {
          for (let j = i + 1; j < this.nodes.length; j++) {
            const dx = this.nodes[i].x - this.nodes[j].x;
            const dy = this.nodes[i].y - this.nodes[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 150) {
              const opacity = 1 - (distance / 150);

              // Create gradient for connections
              const gradient = ctx.createLinearGradient(
                this.nodes[i].x, this.nodes[i].y,
                this.nodes[j].x, this.nodes[j].y
              );
              gradient.addColorStop(0, this.nodes[i].color);
              gradient.addColorStop(1, this.nodes[j].color);

              ctx.globalAlpha = opacity * 0.5;
              ctx.strokeStyle = gradient;

              ctx.beginPath();
              ctx.moveTo(this.nodes[i].x, this.nodes[i].y);
              ctx.lineTo(this.nodes[j].x, this.nodes[j].y);
              ctx.stroke();
            }
          }
        }

        ctx.globalAlpha = 1;
      }

      drawNodes() {
        this.nodes.forEach(node => {
          // Create radial gradient for each node
          const gradient = ctx.createRadialGradient(
            node.x, node.y, 0,
            node.x, node.y, node.radius
          );
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(1, node.color);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }

    // Floating music visualizer bubbles (Spotify-inspired)
    class MusicBubbles {
      constructor() {
        this.bubbles = [];
        this.totalBubbles = 25;

        for (let i = 0; i < this.totalBubbles; i++) {
          this.bubbles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.7, // Keep in upper portion
            size: 5 + Math.random() * 25,
            speedX: (Math.random() - 0.5) * 0.3,
            speedY: (Math.random() - 0.5) * 0.3,
            color: Object.values(brandColors)[Math.floor(Math.random() * Object.values(brandColors).length)],
            pulseSpeed: 0.02 + Math.random() * 0.04,
            pulseAmount: 0,
            opacity: 0.1 + Math.random() * 0.2
          });
        }
      }

      update() {
        this.bubbles.forEach(bubble => {
          // Move bubbles
          bubble.x += bubble.speedX;
          bubble.y += bubble.speedY;

          // Pulsing effect
          bubble.pulseAmount = Math.sin(Date.now() * bubble.pulseSpeed) * 5;

          // Boundary check with bounce
          if (bubble.x < 0 || bubble.x > canvas.width) {
            bubble.speedX *= -1;
          }

          if (bubble.y < 0 || bubble.y > canvas.height * 0.7) {
            bubble.speedY *= -1;
          }
        });
      }

      draw() {
        this.bubbles.forEach(bubble => {
          ctx.globalAlpha = bubble.opacity;

          // Draw glow effect
          const gradient = ctx.createRadialGradient(
            bubble.x, bubble.y, 0,
            bubble.x, bubble.y, bubble.size + bubble.pulseAmount
          );

          gradient.addColorStop(0, bubble.color);
          gradient.addColorStop(1, 'rgba(255,255,255,0)');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(bubble.x, bubble.y, bubble.size + bubble.pulseAmount, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.globalAlpha = 1;
      }
    }

    // Dynamic gradient backdrop (modern UI element)
    class GradientBackdrop {
      constructor() {
        this.time = 0;
        this.speed = 0.0005;
      }

      update() {
        this.time += this.speed;
      }

      draw() {
        // Create a shifting gradient background
        const gradient = ctx.createLinearGradient(
          0, 0,
          canvas.width, canvas.height
        );

        // Color stops cycle over time
        gradient.addColorStop(0, `rgba(240, 249, 255, ${0.95 + Math.sin(this.time) * 0.05})`);
        gradient.addColorStop(0.5 + Math.sin(this.time * 0.5) * 0.1, `rgba(224, 242, 254, ${0.92 + Math.cos(this.time) * 0.08})`);
        gradient.addColorStop(1, `rgba(224, 231, 255, ${0.9 + Math.sin(this.time * 2) * 0.1})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    // Initialize components
    const audioWave = new AudioWave();
    const scrollingCards = new ScrollingCards();
    const networkNodes = new NetworkNodes();
    const musicBubbles = new MusicBubbles();
    const gradientBackdrop = new GradientBackdrop();

    // Animation loop
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw all components
      gradientBackdrop.update();
      gradientBackdrop.draw();

      networkNodes.update();
      networkNodes.drawConnections();

      scrollingCards.update();
      scrollingCards.draw();

      musicBubbles.update();
      musicBubbles.draw();

      audioWave.update();
      audioWave.draw();

      networkNodes.drawNodes();

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed top-0 left-0 w-full h-full -z-10 ${className}`}
    />
  );
};

export default AnimatedBackground;
