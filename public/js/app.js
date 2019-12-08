const digButton = document.querySelector("#dig");
let happinessVal,
  danceabilityVal,
  loudnessVal;

digButton.addEventListener("click", () => {
  const loading = document.querySelector('#loading');
  const contents = document.querySelector('#contents');
  loading.classList.remove('hidden');
  contents.classList.add('hidden');
  window.addEventListener('load', () => {
    loading.classList.add('hidden');
    contents.classList.remove('hidden');
  })
});

