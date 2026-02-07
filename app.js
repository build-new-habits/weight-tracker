// --- CONFIGURATION ---
const TARGET_WEIGHT_LBS = 161; // 11st 7lb
const TARGET_DATE = new Date('2026-05-31'); // May 31st 2026
const START_DATE = new Date('2026-02-07'); // Start of project
const START_WEIGHT_LBS = 178; // 12st 10lb

// User Stats (Change these for better Calorie accuracy)
const USER_HEIGHT_CM = 175; 
const USER_AGE = 35; 
const USER_SEX = 'male'; 

// --- STATE MANAGEMENT ---
let dailyExercises = [];
let appData = JSON.parse(localStorage.getItem('easterTrackerData')) || [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set date input to today
    document.getElementById('entryDate').valueAsDate = new Date();
    
    updateCountdown();
    renderChart();
    updateDashboard();
    renderMilestones(); 
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
    const diffTime = TARGET_DATE - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays > 0) {
        document.getElementById('countdown').innerText = `${diffDays} days until Target`;
    } else {
        document.getElementById('countdown').innerText = "Target Date Reached!";
    }
}

// --- CONVERTERS ---
function lbsToStones(lbs) {
    const st = Math.floor(lbs / 14);
    const remainder = (lbs % 14).toFixed(1);
    return `${st}st ${remainder}lb`;
}

function getWeightInLbs() {
    const st = parseFloat(document.getElementById('weightSt').value) || 0;
    const lb = parseFloat(document.getElementById('weightLb').value) || 0;
    if(st === 0 && lb === 0) return 0;
    return (st * 14) + lb;
}

// --- CALCULATORS ---
function calculateCalories(met, mins) {
    let lbs = getWeightInLbs();
    if(lbs === 0 && appData.length > 0) lbs = appData[appData.length-1].weight;
    if(lbs === 0) lbs = START_WEIGHT_LBS;
    
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
                <span>${ex.cals} kcal <button onclick="removeExercise(${index})" style="color:red;background:none;border:none;cursor:pointer;">x</button></span>
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
    
    const exerciseBurn = dailyExercises.reduce((sum, item) => sum + item.cals, 0);

    // TDEE Calc
    const weightKg = weightLbs * 0.453592;
    let bmr = (10 * weightKg) + (6.25 * USER_HEIGHT_CM) - (5 * USER_AGE) + 5; 
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

    const existingIndex = appData.findIndex(d => d.date === date);
    if (existingIndex > -1) {
        appData[existingIndex] = dayData;
    } else {
        appData.push(dayData);
    }
    
    appData.sort((a,b) => new Date(a.date) - new Date(b.date));
    localStorage.setItem('easterTrackerData', JSON.stringify(appData));
    
    alert("Data Saved!");
    updateDashboard();
    renderChart();
    renderMilestones(); 
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
    }
}

// --- DASHBOARD & CHARTS ---
function updateDashboard() {
    if(appData.length === 0) return;
    
    const current = appData[appData.length - 1];
    document.getElementById('currentWeightDisplay').innerText = lbsToStones(current.weight);
    
    const lossNeeded = current.weight - TARGET_WEIGHT_LBS;
    document.getElementById('lossRequiredDisplay').innerText = lossNeeded > 0 ? `${lossNeeded.toFixed(1)} lbs` : "GOAL HIT!";

    // Prediction Logic
    if(appData.length >= 2) {
        const last7 = appData.slice(-7);
        const first = last7[0];
        const last = last7[last7.length-1];
        const dayDiff = (new Date(last.date) - new Date(first.date)) / (1000*60*60*24);
        
        if (dayDiff > 0) {
            const weightDiff = last.weight - first.weight; 
            const dailyRate = weightDiff / dayDiff; 
            
            const daysToTarget = (TARGET_DATE - new Date()) / (1000*60*60*24);
            const predictedWeight = last.weight + (dailyRate * daysToTarget);
            
            let msg = `Current trend: ${dailyRate.toFixed(2)} lbs/day. `;
            msg += `Projected Finish: <strong>${lbsToStones(predictedWeight)}</strong>. `;
            
            if (predictedWeight <= TARGET_WEIGHT_LBS) {
                 msg += "<span style='color:#03dac6'>On Track! 🎉</span>";
            } else {
                 msg += "<span style='color:#ff5555'>Behind Schedule.</span>";
            }
            
            document.getElementById('predictionText').innerHTML = msg;
        }
    }
}

// --- NEW MILESTONE GENERATOR ---
function renderMilestones() {
    const tbody = document.getElementById('milestone-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const totalDays = (TARGET_DATE - START_DATE) / (1000 * 60 * 60 * 24);
    const totalLoss = START_WEIGHT_LBS - TARGET_WEIGHT_LBS;
    const lossPerDay = totalLoss / totalDays;

    // Loop through weeks
    let currentDate = new Date(START_DATE);
    // Move to next Sunday
    currentDate.setDate(currentDate.getDate() + (7 - currentDate.getDay()));

    while (currentDate <= TARGET_DATE) {
        // Calculate Target Weight for this date
        const daysPassed = (currentDate - START_DATE) / (1000 * 60 * 60 * 24);
        const targetW = START_WEIGHT_LBS - (lossPerDay * daysPassed);
        
        // Check actual status if we have data for this week
        let status = "-";
        let statusColor = "#888";
        
        const closeEntry = appData.find(d => {
            const dDate = new Date(d.date);
            const diff = Math.abs(dDate - currentDate) / (1000*60*60*24);
            return diff <= 3; 
        });

        if (closeEntry) {
            const diff = closeEntry.weight - targetW;
            if (diff <= 0.5) {
                status = "✅ Met";
                statusColor = "#03dac6"; // Green
            } else {
                status = `⚠️ +${diff.toFixed(1)}lb`;
                statusColor = "#ff5555"; // Red
            }
        } else if (currentDate < new Date()) {
            status = "❌ Missed";
             statusColor = "#555";
        }

        const row = `
            <tr style="border-bottom: 1px solid #333;">
                <td style="padding: 12px 8px;">${currentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                <td style="text-align: right; padding: 12px 8px; font-weight: bold;">${lbsToStones(targetW)}</td>
                <td style="text-align: right; padding: 12px 8px; color: ${statusColor};">${status}</td>
            </tr>
        `;
        tbody.innerHTML += row;

        // Add 7 days
        currentDate.setDate(currentDate.getDate() + 7);
    }
}

let myChart;

function renderChart() {
    const ctx = document.getElementById('weightChart').getContext('2d');
    
    const labels = appData.map(d => d.date);
    const weights = appData.map(d => d.weight);
    
    // Create Target Line (Start to End)
    const idealLine = [
        { x: START_DATE.toISOString().split('T')[0], y: START_WEIGHT_LBS },
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
                    data: idealLine,
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
                    time: { unit: 'month' },
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
    alert("Data logged to Console");
}
