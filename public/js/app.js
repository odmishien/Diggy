const digButton = document.querySelector("#digBtn");
let happinessVal,
  danceabilityVal,
  loudnessVal;

digButton.addEventListener("click", () => {
  happinessVal = document.querySelector("#happiness").value;
  danceabilityVal = document.querySelector("#danceability").value;
  loudnessVal = document.querySelector("#loudness").value;
});

const loading = document.querySelector('#loading');
const contents = document.querySelector('#contents');

window.addEventListener('load', () => {
  loading.classList.toggle('hidden');
  contents.classList.toggle('hidden')
})
