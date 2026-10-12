import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient('https://mqxnnixvqdvnvylydvwk.supabase.co', 'sb_publishable_ZB3bRVzFlmnpA-bbOcrtxQ_R4cQHHJT');

const yearDisplayTemplate = document.getElementById('year-display-template');
const yearDisplayContainer = document.getElementById('year-display-container');

const predictionDisplayTemplate = document.getElementById('prediction-display-template');

async function displayYear(item) {
    const yearDisplay = document.importNode(yearDisplayTemplate.content, true);
    const year = item.year;

    yearDisplay.querySelector('.year').textContent = year;
    yearDisplay.querySelector('.date').textContent = "Actual Date: " + item.first_measurable_snowfall;

    const { data, error } = await supabase
        .from('predictions')
        .select()
        .eq('year', year)
    if (error) {
        console.error('Supabase error:', error.message);
    } else {
        addPrediction(yearDisplay, data);
    }

    yearDisplayContainer.appendChild(yearDisplay, year);
}

async function addPrediction(yearDisplay, data) {
    for (const prediction of data) {
        console.log(prediction);
        const predictionDisplay = document.importNode(predictionDisplayTemplate.content, true);

        predictionDisplay.querySelector('.name').textContent = prediction.name;

        let predictionDateText;
        const predictionDate = prediction.prediction;
        if (predictionDate === null) {
            predictionDateText = "No Prediction";

            const addPredictionButton = predictionDisplay.querySelector('.add-prediction-button');
            const predictionInput = predictionDisplay.querySelector('.prediction-input');

            addPredictionButton.style.display = "inline-block";

            addPredictionButton.addEventListener('click', async () => { 
                const isHidden = predictionInput.style.display === "none";

                if (isHidden) {
                    predictionInput.style.display = "inline-block";
                } else {
                    predictionInput.style.display = "none";
                }
            });
        } else {
            predictionDateText = "Predicted Date: " + predictionDate;
        }
        predictionDisplay.querySelector('.date').textContent = predictionDateText;

        yearDisplay.querySelector('.year-display').appendChild(predictionDisplay);
    }
}

const { data, error } = await supabase
  .from('years')
  .select()

if (error) {
  console.error('Supabase error:', error.message);
} else {
  console.log('Data:', data);
  
  data.forEach((item) => {
    displayYear(item);
  });
}

