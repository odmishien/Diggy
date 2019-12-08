const digButton = document.querySelector("#dig");
let happinessVal,
  danceabilityVal,
  loudnessVal;

digButton.addEventListener("click", () => {
  const loading = document.querySelector('#loading');
  const contents = document.querySelector('#contents');
  loading.classList.toggle('hidden');
  contents.classList.toggle('hidden');
  window.addEventListener('load', () => {
    loading.classList.toggle('hidden');
    contents.classList.toggle('hidden');
  })
});

