// --- CONFIGURATION ---
const TARGET_WEIGHT_LBS = 159; // 11st 5lb
const TARGET_DATE = new Date('2026-04-05'); // Easter Sunday 2026
const USER_HEIGHT_CM = 175; // Average height (Change this if you want accuracy)
const USER_AGE = 35; // Average age (Change for accuracy)
const USER_SEX = 'male'; 

// --- STATE MANAGEMENT ---
let dailyExercises = [];
let appData = JSON.parse(localStorage.getItem('easterTrackerData')) || [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('entryDate').valueAsDate = new Date();
    updateCountdown();
    renderChart();
    updateDashboard();
    
    // Load today's data if it exists
    loadToday();
});

// --- UI HELPERS ---
function toggleActivityMode(mode) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.activity-mode').forEach(d => d.classList.add('hidden'));
    
    if(mode === 'auto') {
        document.getElementById('auto-activity').classList.remove('hidden');
        document.querySelector('.tab-btn:first-child').classList.add('active');
    } else {
        document.getElementById('manual-activity').classList.remove('hidden');
        document.querySelector('.tab-btn:last-child').classList.add('active');
    }
}

function updateCountdown() {
    const today = new Date();
    const diffTime = Math.abs(TARGET_DATE - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    document.getElementById('countdown').innerText = `${diffDays} days until Easter Deadline`;
}

// --- CALCULATORS ---
function getWeightInLbs() {
    const st = parseFloat(document.getElementById('weightSt').value) || 0;
    const lb = parseFloat(document.getElementById('weightLb').value) || 0;
    if(st === 0 && lb === 0) return 0;
    return (st * 14) + lb;
}

function calculateCalories(met, mins) {
    // Formula: MET * Weight(kg) * Time(hours)
    // We use current weight from input, or fallback to last known weight
    let lbs = getWeightInLbs();
    if(lbs === 0 && appData.length > 0) lbs = appData[appData.length-1].weight;
    if(lbs === 0) lbs = 178; // Fallback to starting weight (12st 10)
    
    const kg = lbs * 0.453592;
    const hours = mins / 60;
    return Math.round(met * kg * hours);
}

// --- LOGIC: ADD EXERCISE ---
function addExercise() {
    const select = document.getElementById('activityType');
    const met = parseFloat(select.value);
    const mins = parseFloat(document.getElementById('activityMins').value);
    const activityName = select.options[select.selectedIndex].text;

    if (!met || !mins) return alert("Please select activity and time.");

    const burned = calculateCalories(met, mins);
    pushExercise(activityName, mins, burned);
}

function addManualExercise() {
    const cals = parseFloat(document.getElementById('manualCals').value);
    if (!cals) return;
    pushExercise("Manual Entry (Watch)", "N/A", cals);
}

function pushExercise(name, duration, cals) {
    dailyExercises.push({ name, duration, cals });
    renderExerciseList();
    
    // Clear inputs
    document.getElementById('activityMins').value = '';
    document.getElementById('manualCals').value = '';
}

function renderExerciseList() {
    const list = document.getElementById('exerciseList');
    list.innerHTML = '';
    let total = 0;
    
    dailyExercises.forEach((ex, index) => {
        total += ex.cals;
        list.innerHTML += `
            <li>
                <span>${ex.name} (${ex.duration}m)</span>
                <span>${ex.cals} kcal <button onclick="removeExercise(${index})" style="color:red;background:none;border:none;">x</button></span>
            </li>
        `;
    });
    document.getElementById('totalBurnDisplay').innerText = total;
}

function removeExercise(index) {
    dailyExercises.splice(index, 1);
    renderExerciseList();
}

// --- LOGIC: SAVE DATA ---
function saveDay() {
    const date = document.getElementById('entryDate').value;
    const weightLbs = getWeightInLbs();
    
    if (weightLbs === 0) return alert("Please enter your weight.");

    const foodCals = parseFloat(document.getElementById('foodCals').value) || 0;
    const water = parseFloat(document.getElementById('waterMl').value) || 0;
    const drinks = document.getElementById('drinksDetails').value;
    
    // Calculate Total Burned from Exercises
    const exerciseBurn = dailyExercises.reduce((sum, item) => sum + item.cals, 0);

    // Calculate TDEE (Base Metabolic Rate)
    // Mifflin-St Jeor Equation approx
    const weightKg = weightLbs * 0.453592;
    // BMR
    let bmr = (10 * weightKg) + (6.25 * USER_HEIGHT_CM) - (5 * USER_AGE) + 5; 
    // Sedentary Multiplier (we add exercise separately)
    let tdee = bmr * 1.2; 
    
    const dayData = {
        date: date,
        weight: weightLbs,
        foodIn: foodCals,
        exerciseOut: exerciseBurn,
        tdee: tdee,
        water: water,
        drinks: drinks,
        netCals: (foodCals - (tdee + exerciseBurn))
    };

    // Check if date exists and overwrite, else push
    const existingIndex = appData.findIndex(d => d.date === date);
    if (existingIndex > -1) {
        appData[existingIndex] = dayData;
    } else {
        appData.push(dayData);
    }
    
    // Sort by date
    appData.sort((a,b) => new Date(a.date) - new Date(b.date));

    // Save to LocalStorage
    localStorage.setItem('easterTrackerData', JSON.stringify(appData));
    
    alert("Data Saved!");
    updateDashboard();
    renderChart();
}

function loadToday() {
    const date = document.getElementById('entryDate').value;
    const dayData = appData.find(d => d.date === date);
    
    if(dayData) {
        const st = Math.floor(dayData.weight / 14);
        const lb = (dayData.weight % 14).toFixed(1);
        document.getElementById('weightSt').value = st;
        document.getElementById('weightLb').value = lb;
        document.getElementById('foodCals').value = dayData.foodIn;
        document.getElementById('waterMl').value = dayData.water;
        document.getElementById('drinksDetails').value = dayData.drinks || "";
        // Note: We don't reload specific exercises for simplicity in this version, 
        // just the calculated totals if we were to expand logic. 
        // For now, exercise list resets on refresh but totals are saved in 'exerciseOut' in history.
    }
}

// --- DASHBOARD & CHARTS ---
function updateDashboard() {
    if(appData.length === 0) return;
    
    const current = appData[appData.length - 1];
    const st = Math.floor(current.weight / 14);
    const lb = (current.weight % 14).toFixed(1);
    
    document.getElementById('currentWeightDisplay').innerText = `${st}st ${lb}lb`;
    
    const lossNeeded = current.weight - TARGET_WEIGHT_LBS;
    document.getElementById('lossRequiredDisplay').innerText = lossNeeded > 0 ? `${lossNeeded.toFixed(1)} lbs` : "GOAL HIT!";

    // Simple Prediction
    // Calculate average daily loss over last 7 entries
    if(appData.length >= 2) {
        const last7 = appData.slice(-7);
        const first = last7[0];
        const last = last7[last7.length-1];
        const dayDiff = (new Date(last.date) - new Date(first.date)) / (1000*60*60*24);
        
        if (dayDiff > 0) {
            const weightDiff = last.weight - first.weight; // should be negative
            const dailyRate = weightDiff / dayDiff; // lbs per day
            
            const daysToEaster = (TARGET_DATE - new Date()) / (1000*60*60*24);
            const predictedWeight = last.weight + (dailyRate * daysToEaster);
            const pSt = Math.floor(predictedWeight / 14);
            const pLb = (predictedWeight % 14).toFixed(1);
            
            let msg = `Current trend: ${dailyRate.toFixed(2)} lbs/day. `;
            msg += `Easter Forecast: <strong>${pSt}st ${pLb}lb</strong>. `;
            msg += (predictedWeight < TARGET_WEIGHT_LBS) ? "You are on track! 🎉" : "You need to increase deficit. ⚠️";
            
            document.getElementById('predictionText').innerHTML = msg;
        }
    }
}

let myChart;

function renderChart() {
    const ctx = document.getElementById('weightChart').getContext('2d');
    
    const labels = appData.map(d => d.date);
    const weights = appData.map(d => d.weight);
    
    // Create Target Line
    const startDate = appData.length > 0 ? appData[0].date : new Date().toISOString().split('T')[0];
    const startWeight = appData.length > 0 ? appData[0].weight : 178;
    
    const targetLine = [
        { x: startDate, y: startWeight },
        { x: TARGET_DATE.toISOString().split('T')[0], y: TARGET_WEIGHT_LBS }
    ];

    if(myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Actual Weight (lbs)',
                    data: weights.map((w, i) => ({x: labels[i], y: w})),
                    borderColor: '#03dac6',
                    tension: 0.1
                },
                {
                    label: 'Target Path',
                    data: targetLine,
                    borderColor: '#bb86fc',
                    borderDash: [5, 5],
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'day' },
                    grid: { color: '#333' }
                },
                y: {
                    grid: { color: '#333' }
                }
            }
        }
    });
}

function clearData() {
    if(confirm("Delete all history?")) {
        localStorage.removeItem('easterTrackerData');
        location.reload();
    }
}

function exportData() {
    console.log(JSON.stringify(appData));
    alert("Check browser console for raw JSON data.");
}
