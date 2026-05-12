function toggleMenu() {
  document.getElementById("nav").classList.toggle("active");
}

window.addEventListener("scroll", function () {
  const header = document.querySelector(".header");

  if (window.scrollY > 60) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
});

const revealElements = document.querySelectorAll(
  ".section, .about-section, .why-section, .oem-section, .contact-section"
);

revealElements.forEach((el) => {
  el.classList.add("reveal");
});

function revealOnScroll() {
  revealElements.forEach((el) => {
    const windowHeight = window.innerHeight;
    const elementTop = el.getBoundingClientRect().top;

    if (elementTop < windowHeight - 120) {
      el.classList.add("active");
    }
  });
}

window.addEventListener("scroll", revealOnScroll);
window.addEventListener("load", revealOnScroll);
