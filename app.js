import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient('https://mqxnnixvqdvnvylydvwk.supabase.co', 'sb_publishable_ZB3bRVzFlmnpA-bbOcrtxQ_R4cQHHJT');

const yearDisplayTemplate = document.getElementById('year-display-template');
const yearDisplayContainer = document.getElementById('year-display-container');

const predictionDisplayTemplate = document.getElementById('prediction-display-template');

const yearDisplaysMap = new Map();
const predictionDisplaysMap = new Map();

async function createPage() {
    const { data, error } = await supabase
        .from('years')
        .select()
    //  .order('year', { ascending: true });

    if (error) {
        console.error('Supabase error:', error.message);
    } else {
        for (let i = 0; i < data.length; i++) {
            await addYearDisplay(data[i]);
        }
    }
}

async function addYearDisplay(yearToAdd) {
    const fragment = document.importNode(yearDisplayTemplate.content, true);
    const yearDisplay = fragment.querySelector('.year-display');
    const year = yearToAdd.year;

    setYearDisplay(year, yearDisplay);

    yearDisplay.querySelector('.year').textContent = year;
    yearDisplay.querySelector('.date').textContent = "Actual Date: " + yearToAdd.first_measurable_snowfall;

    await addPredictionDisplays(year);

    yearDisplayContainer.appendChild(yearDisplay, year);
}

async function addPredictionDisplays(year) {
    const yearData = await getPredictionsDataForYear(year);
    
    for (const predictionData of yearData) {
        const fragment = document.importNode(predictionDisplayTemplate.content, true);
        const predictionDisplay = fragment.querySelector('.prediction-display');
        const name = predictionData.name;

        setPredictionDisplay(name, year, predictionDisplay);

        predictionDisplay.querySelector('.name').textContent = name;

        const makePredictionButton = predictionDisplay.querySelector('.make-prediction-button');
        const predictionInput = predictionDisplay.querySelector('.prediction-input');

        makePredictionButton.addEventListener('click', async () => {
            makeNewPrediction(year, name, predictionInput.value)
        });

        getYearDisplay(year).appendChild(predictionDisplay);
    }

    updatePredictionDisplays(year);
}

async function makeNewPrediction(year, name, predictionDate) {
    const today = new Date().toLocaleDateString('en-CA');
    const diffInDays = Math.round(
        Math.abs(new Date(predictionDate) - new Date(today)) / 86400000
    );

    if (!predictionDate || diffInDays <= 0 || diffInDays > 200) {
        return;
        // Add way to convey error message
    }

    const { data, error } = await supabase
        .from('predictions')
        .update({ prediction: predictionDate })
        .eq('year', year)
        .eq('name', name)
        .select('*')

    if (error) {
        console.error('Supabase error:', error.message);
    } else {
        updatePredictionDisplays(year);
    }
}

// Helper functions
async function getPredictionsDataForYear(year) {
    const { data, error } = await supabase
        .from('predictions')
        .select()
        .eq('year', year)

    if (error) {
        console.error('Supabase error:', error.message);
    } else {
        return data;
    }
    return null;
}

async function updatePredictionDisplays(year) {
    const yearData = await getPredictionsDataForYear(year);
    
    let allPredictionsMade = true;
    for (const predictionData of yearData) {
        if (predictionData.prediction === null) {
            allPredictionsMade = false;
        }
    }

    for (const predictionData of yearData) {
        const predictionDisplay = getPredictionDisplay(predictionData.name, year);

        const makePredictionButton = predictionDisplay.querySelector('.make-prediction-button');
        const predictionInput = predictionDisplay.querySelector('.prediction-input');

        const predictionDate = predictionData.prediction;
        let predictionDateText;
        if (predictionDate === null) {
            predictionDateText = "No Prediction";

            makePredictionButton.style.display = "inline-block"
            predictionInput.style.display = "inline-block";
        } else {
            if (allPredictionsMade) {
                predictionDateText = "Predicted Date: " + predictionDate;
            } else {
                predictionDateText = "Prediction Made";
            }

            makePredictionButton.style.display = "none"
            predictionInput.style.display = "none";
        }
        predictionDisplay.querySelector('.date').textContent = predictionDateText;
    }
}

function getYearDisplay(year) {
    return yearDisplaysMap.get(year);
}

function setYearDisplay(year, yearDisplay) {
    yearDisplaysMap.set(year, yearDisplay);
}

function getPredictionDisplay(name, year) {
    return predictionDisplaysMap.get(getComposite(name, year));
}

function setPredictionDisplay(name, year, predictionDisplay) {
    predictionDisplaysMap.set(getComposite(name ,year), predictionDisplay);
}
function getComposite(name, year) {
    return `${name}_${year}`;
}

createPage();