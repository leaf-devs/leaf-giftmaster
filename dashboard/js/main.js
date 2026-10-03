// ------------------------------------------------------------------
// Login form — floating label animation
// ------------------------------------------------------------------

const inputs = document.querySelectorAll(".input");

function addFocus() {
  const parent = this.parentNode.parentNode;
  parent.classList.add("focus");
}

function removeFocus() {
  const parent = this.parentNode.parentNode;
  if (this.value === "") {
    parent.classList.remove("focus");
  }
}

inputs.forEach((input) => {
  input.addEventListener("focus", addFocus);
  input.addEventListener("blur", removeFocus);
});

// ------------------------------------------------------------------
// Floating heart tooltip
// ------------------------------------------------------------------

const floatingHeart = document.querySelector(".floating-heart");

if (floatingHeart) {
  const tooltip = floatingHeart.querySelector(".tooltip");

  if (tooltip) {
    tooltip.style.display = "none";

    floatingHeart.addEventListener("click", () => {
      tooltip.style.display =
        tooltip.style.display === "block" ? "none" : "block";
    });
  }
}