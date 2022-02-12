'use strict';

///////////////////////////////////
// Workout Data
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

///////////////////////////////////
// APP Architecture

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAllWorkoutsButton = document.querySelector('.delete__button');
// const sortWorkouts = document.querySelector('.sort__workout');
// const sortDate = document.querySelector('.sort__date');
// const sortDistance = document.querySelector('.sort__distance');
// const sortDuration = document.querySelector('.sort__duration');
const error = document.querySelector('.error__message');

class App {
  #map;
  #mapZoomLevel = 14;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get User Position
    this._getPosition();

    //Get data from localstorage
    this._getLocalStorage();

    // All Events Listener
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    document.addEventListener('click', this._deleteWorkout.bind(this));
    deleteAllWorkoutsButton.addEventListener('click', this.reset.bind(this));
    document.addEventListener('change', this._editWorkout.bind(this));
    // sortDistance.addEventListener('click', this._sortWorkout.bind(this));
    error.addEventListener('click', this._errorMessage.bind(this));
  }

  _getPosition() {
    // Geolocation
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  // Leaflet Library
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.cz/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); // #mapZoomLevel is the zoom of the map

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    // We put it here, cause the map is not yet loaded. So putting it at the end would not work!
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  // Show Workout Form
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Cleaer Input Fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _errorMessage() {
    error.classList.toggle('hidden');
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get Data From Form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if Data is Valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return this._errorMessage();

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return this._errorMessage();

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);
    // Display Marker

    // Render workout on list
    this._renderWorkout(workout);

    //Hide form + clear input field
    this._hideForm();

    // Set Local Storage to all Workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
    <h2 class="workout__title">${
      workout.description
    }<span id="delete">X</span></h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <input class="workout__value distance__value" value="${workout.distance}">
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <input class="workout__value duration__value" value="${workout.duration}">
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running')
      html += `          
        <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <input class="workout__value pace__value" value="${workout.pace.toFixed(
          1
        )}">
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <input class="workout__value cadence__value" value="${workout.cadence}">
        <span class="workout__unit">spm</span>
      </div>
      </li>`;

    if (workout.type === 'cycling')
      html += `          
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <input class="workout__value speed__value" value= "${workout.speed.toFixed(
          1
        )}">
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <input class="workout__value elevation__value" value="${
          workout.elevationGain
        }">
        <span class="workout__unit">m</span>
        </div>
    </li> `;

    form.insertAdjacentHTML('afterend', html);

    // Delete All Workouts Button
    if (this.#workouts.length > 1) {
      const deleteAll = document.querySelector('.delete__button');
      deleteAll.style.display = 'block';
    }
    // Edit Workout
    document.addEventListener('change', this._editWorkout.bind(this));
  }

  // // Sort Workouts
  // _sortWorkout() {
  //   let workout = [];
  //   let workoutSorted = false;

  //   this.#workouts.forEach(function (work, i) {
  //     workout.push(work.distance);

  //     workout.sort((a, b) => a - b);
  //     workoutSorted = !workoutSorted;
  //   });
  //   console.log(workoutSorted);
  //   console.log(workout);
  // }

  // Edit Workout
  _editWorkout(e) {
    const editWorkout = e.target;
    const workoutEl = e.target.closest('.workout');

    let workout = JSON.parse(localStorage.getItem('workouts'));

    if (workout == null) {
      return;
    }

    workout.forEach(function (workout) {
      if (
        editWorkout.classList.contains('elevation__value') &&
        workout.id === workoutEl.dataset.id
      ) {
        workout.elevationGain = +editWorkout.value;
        return;
      }
      if (
        editWorkout.classList.contains('distance__value') &&
        workout.id === workoutEl.dataset.id
      ) {
        workout.distance = +editWorkout.value;
        return;
      }
      if (
        editWorkout.classList.contains('duration__value') &&
        workout.id === workoutEl.dataset.id
      ) {
        workout.duration = +editWorkout.value;
      }
      if (
        editWorkout.classList.contains('cadence__value') &&
        workout.id === workoutEl.dataset.id
      ) {
        workout.cadence = +editWorkout.value;
      }
      if (workout.type === 'running') {
        workout.pace = workout.duration / workout.distance;
        workout.pace;
      }

      if (workout.type === 'cycling') {
        workout.speed = workout.distance / (workout.duration / 60);
        workout.speed;
      }
    });

    localStorage.setItem('workouts', JSON.stringify(workout));
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // setView is from Leaflet library
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  // Delete a single workout
  _deleteWorkout(e) {
    if (e.target && e.target.id == 'delete') {
      const deleteWorkout = e.target.closest('.workout');

      let workoutE = JSON.parse(localStorage.getItem('workouts'));
      workoutE.forEach(function (workout, index) {
        if (workout.id === deleteWorkout.dataset.id) {
          workoutE.splice(index, 1);
        }
      });
      localStorage.setItem('workouts', JSON.stringify(workoutE));
      location.reload();
    } else {
      return;
    }
  }

  ////////////////
  // Local Storage

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    if (confirm('Do you want to delete all your workouts?') == true) {
      localStorage.removeItem('workouts');
      location.reload();
    }
  }
}

const app = new App();

///////////////////////////////////////
// Improvements
// 4) Ability to sort workouts by certain field (e.g. distance);
// 5) Re-build running and Cycling objects coming from Local Storage;
// 6) More realistic confirmation messages;
// 7) Ability to position the map to show all workouts[very hard];
// 8) Ability to draw lines and shapes instead of just points [very hard];
// 9) Geocode location from cordination ("Run in Faro, Portugal") [only after asynchronous JavaScript section];
// 10) Display weather data for workout time and place [only after asynchronous JavaScript section];
