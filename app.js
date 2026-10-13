import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient('https://mqxnnixvqdvnvylydvwk.supabase.co', 'sb_publishable_ZB3bRVzFlmnpA-bbOcrtxQ_R4cQHHJT');

const yearDisplayTemplate = document.getElementById('year-display-template');
const yearDisplayContainer = document.getElementById('year-display-container');

const predictionDisplayTemplate = document.getElementById('prediction-display-template');

async function createPage() {
    const { data, error } = await supabase
        .from('years')
        .select()
    // .order('year', { ascending: true });

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

    yearDisplay.querySelector('.year').textContent = year;
    yearDisplay.querySelector('.date').textContent = "Actual Date: " + yearToAdd.first_measurable_snowfall;

    const { data, error } = await supabase
        .from('predictions')
        .select()
        .eq('year', year)
    if (error) {
        console.error('Supabase error:', error.message);
    } else {
        for (const prediction of data) {
            const predictionDisplay = await addPredictionDisplay(prediction);
            yearDisplay.appendChild(predictionDisplay);
        }
    }

    yearDisplayContainer.appendChild(yearDisplay, year);
}

async function addPredictionDisplay(predictionData) {
    const fragment = document.importNode(predictionDisplayTemplate.content, true);
    const predictionDisplay = fragment.querySelector('.prediction-display');

    const name = predictionData.name;
    predictionDisplay.querySelector('.name').textContent = name;

    let predictionDateText;
    const predictionDate = predictionData.prediction;
    if (predictionDate === null) {
        predictionDateText = "No Prediction";

        const makePredictionButton = predictionDisplay.querySelector('.make-prediction-button');
        const predictionInput = predictionDisplay.querySelector('.prediction-input');

        makePredictionButton.style.display = "inline-block";
        predictionInput.style.display = "inline-block";

        makePredictionButton.addEventListener('click', async () => {
            makeNewPrediction(predictionDisplay, predictionData.year, name, predictionInput.value);
        });
    } else {
        predictionDateText = "Predicted Date: " + predictionDate;
    }
    predictionDisplay.querySelector('.date').textContent = predictionDateText;

    return predictionDisplay;
}

async function makeNewPrediction(predictionDisplay, year, name, predictionDate) {
    const today = new Date().toLocaleDateString('en-CA');
    const diffInDays = Math.round(
        Math.abs(new Date(predictionDate) - new Date(today)) / 86400000
    );

    console.log(diffInDays);

    if (predictionDate === null || diffInDays <= 0 || diffInDays > 200)
    {
        return;
        // Add way to convey error message
    }

    const { data, error } = await supabase
        .from('predictions')
        .update({ prediction: predictionDate })
        .eq('year', year)
        .eq('name', name)
        .select()

    if (error) {
        console.error('Supabase error:', error.message);
    } else {
        console.log('Prediction added:', data);

        const makePredictionButton = predictionDisplay.querySelector('.make-prediction-button');
        const predictionInput = predictionDisplay.querySelector('.prediction-input');

        makePredictionButton.style.display = "none";
        predictionInput.style.display = "none";

        predictionDisplay.querySelector('.date').textContent = "Predicted Date: " + predictionDate;;
    }
}

createPage();