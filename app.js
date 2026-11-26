import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient('https://mqxnnixvqdvnvylydvwk.supabase.co', 'sb_publishable_ZB3bRVzFlmnpA-bbOcrtxQ_R4cQHHJT');

import { Calendar } from 'https://esm.sh/fullcalendar@6.1.19';

const tabDisplaysMap = new Map();

const predictionDisplaysMap = new Map();

/**
 * Called once to initialize the application.
 */
async function createPage() {
    // Select year data from database
    const { data, error } = await supabase
        .from('years')
        .select()
        .order('year', { ascending: false });

    if (error) {
        console.error('Supabase error:', error.message);
    } else {
        // Call addYearDisplay for each year
        for (let i = 0; i < data.length; i++) {
            await addYearDisplay(data[i]);
        }

        await createStatsDisplay();

        // Start page with earliest year tab open
        showTab(data[0].year);
    }
}

/**
 * Creates the statistics tab.
 * INCOMPLETE
 */
async function createStatsDisplay() {
    const statsDisplay = document.getElementById('stats-display');

    addTab("Statistics", statsDisplay);
}

/**
 * Creates a year tab and initializes it's content.
 * 
 * @param {number} yearToAdd - Year to create tab for.
 */
async function addYearDisplay(yearToAdd) {
    // Create HTML references
    const yearDisplayTemplate = document.getElementById('year-display-template');
    const fragment = document.importNode(yearDisplayTemplate.content, true);
    const yearDisplay = fragment.querySelector('.year-display');

    const year = yearToAdd.year;

    // Set year display text
    yearDisplay.querySelector('.year').textContent = year;
    yearDisplay.querySelector('.date').textContent = "Actual Date: " + yearToAdd.first_measurable_snowfall;

    // Add new year display to container
    document.getElementById('year-display-container').appendChild(yearDisplay, year);

    // Create a new tab with key year and content yearDisplay
    await addTab(year, yearDisplay);

    // Create prediction displays to be included in year display
    await addPredictionDisplays(year);

    // Create calendar
    await addCalendar(year, yearToAdd.first_measurable_snowfall);
}

/**
 * Creates all prediction displays and adds it to a given year.
 * 
 * @param {number} year - Year to create prediction displays for.
 */
async function addPredictionDisplays(year) {
    // Get data for all predictions from year
    const yearData = await getPredictionsDataForYear(year);

    // Iterate through all predictions within yearData
    for (const predictionData of yearData) {
        // Create HTML references
        const predictionDisplayTemplate = document.getElementById('prediction-display-template');
        const fragment = document.importNode(predictionDisplayTemplate.content, true);
        const predictionDisplay = fragment.querySelector('.prediction-display');

        const name = predictionData.name;

        // Set prediction display text
        predictionDisplay.querySelector('.name').textContent = name;

        // Create HTML references for new prediction imput
        const makePredictionButton = predictionDisplay.querySelector('.make-prediction-button');
        const predictionInput = predictionDisplay.querySelector('.prediction-input');

        makePredictionButton.addEventListener('click', async () => {
            makeNewPrediction(year, name, predictionInput.value)
        });

        // Append new prediction display to year
        getYearDisplay(year).appendChild(predictionDisplay);

        // Registers new prediction display into map
        setPredictionDisplay(name, year, predictionDisplay);
    }

    updatePredictionDisplays(year);
}

/**
 * Adds a new tab that can be selected to display content.
 * 
 * @param {any} tabName - Name of the tab. Converts to string to be used as key.
 * @param {HTMLElement} tabContent - Content to be displayed as the tab.
 * @throws {Error} Throws error if tabName already exists as a key.
 */
async function addTab(tabName, tabContent) {
    // Check that tabName doesn't already exist as a key
    if (tabDisplaysMap.has(tabName.toString())) {
        throw new Error("Tab already exists with name: " + tabName);
    }

    // Create HTML references
    const tabSelectorTemplate = document.getElementById('tab-selector-template');
    const fragment = document.importNode(tabSelectorTemplate.content, true);
    const tabSelector = fragment.querySelector('.tab-selector');
    const button = tabSelector.querySelector('.tab-selector-button');

    button.textContent = tabName;
    tabSelector.style.display = "block";

    // Register new tab into map
    addTabToMap(tabName, tabContent);

    button.addEventListener('click', async () => {
        showTab(tabName);
    });

    // Add new tab selector to container 
    document.getElementById('tab-selector-container').appendChild(tabSelector);
}

/**
 * Shows content for a given tab and hides other tabs.
 * 
 * @param {any} tabName - Name of tab to display.
 */
async function showTab(tabName) {
    // Iterate through and hides all displays in the tab map
    for (const [key, value] of tabDisplaysMap) {
        value.style.display = "none";
    }

    const yearDisplay = getTab(tabName);

    yearDisplay.style.display = "block";
}

/**
 * Makes a new prediction and updates database.
 * 
 * @param {number} year - Year to make prediction in.
 * @param {string} name - Name of person making prediction.
 * @param {Date} predictionDate - Date of prediction.
 */
async function makeNewPrediction(year, name, predictionDate) {
    // Calculate time between today and prediction in days
    const today = new Date().toLocaleDateString('en-CA');
    const diffInDays = Math.round(
        Math.abs(new Date(predictionDate) - new Date(today)) / 86400000
    );

    // Prevent making prediction if day isn't within given range
    if (!predictionDate || diffInDays <= 0 || diffInDays > 200) {
        return;
        // Add way to convey error message
    }

    // Add new prediction to database
    const { data, error } = await supabase
        .from('predictions')
        .update({ prediction: predictionDate })
        .eq('year', year)
        .eq('name', name)
        .select('*')

    if (error) {
        console.error('Supabase error:', error.message);
    } else {
        // Update prediction displays to show new prediction
        updatePredictionDisplays(year);
    }

    addCalendarPrediction(name, predictionDate, getCalendar(year));
}

/**
 * Creates a calendar and adds it to year display.
 * 
 * @param {number} year - Year to add calendar for.
 * @param {string} actualDate - Actual snowfall date.
 */
async function addCalendar(year, actualDate) {
    console.log(actualDate);
    // Create HTML references
    const yearDisplay = getYearDisplay(year);
    const calendarElement = yearDisplay.querySelector('#calendar');

    const yearData = await getPredictionsDataForYear(year);
    let startDate = new Date(yearData[0].prediction + 'T00:00:00');
    let endDate = new Date(yearData[yearData.length - 1].prediction + 'T00:00:00');
    const snowfallDate = new Date(actualDate + 'T00:00:00');

    // Adjust bounds if actual snowfall date is outside
    if (snowfallDate < startDate) {
        startDate = snowfallDate;
    }
    if (snowfallDate > endDate) {
        endDate = snowfallDate;
    }

    // Create new calendar
    const calendar = new Calendar(calendarElement, {
        initialView: 'dayGridMonth',
        validRange: {
            start: new Date(startDate.getFullYear(), startDate.getMonth(), 1),
            end: new Date(endDate.getFullYear(), endDate.getMonth() + 1, 1)
        },
        headerToolbar: {
            left: 'prev,next',
            center: 'title',
            right: ''
        },
        height: 'auto'
    });

    // Associate calendar with calendar element for later retrieval
    calendarElement._fullCalendar = calendar;

    for (const predictionData of yearData) {
        addCalendarPrediction(predictionData.name, predictionData.prediction, calendar);
    }

    if (actualDate != null) {
        calendar.addEvent({
            title: 'First Snowfall',
            start: snowfallDate,
            allDay: true
        })
    }

    calendar.render();
}

/**
 * Adds a new prediction to the calendar.
 * 
 * @param {string} name - Name of the person to add prediction for.
 * @param {number} date - Date of prediction.
 * @param {Calendar} calendar - Calendar to add prediction to.
 */
async function addCalendarPrediction(name, date, calendar) {
    if (date === null) {
        return;
    }
    
    calendar.addEvent({
        title: name,
        start: date,
        allDay: true
    });
}

// Helper functions

/**
 * Gets all prediction data for a given year.
 * 
 * @param {num} year - Year to get prediction data for.
 * @returns {any} The fetched prediction data.
 */
async function getPredictionsDataForYear(year) {
    const { data, error } = await supabase
        .from('predictions')
        .select()
        .eq('year', year)
        .order('prediction', { ascending: true })
        .order('id', { ascending: true })

    if (error) {
        console.error('Supabase error:', error.message);
    } else {
        return data;
    }
    return null;
}

/**
 * Updates all prediction displays in a given year.
 * 
 * @param {num} year - Year to prediction displays for.
 */
async function updatePredictionDisplays(year) {
    // Get data for all predictions from year
    const yearData = await getPredictionsDataForYear(year);

    // Iterate through all predictions and determine if all predictions have been made
    let allPredictionsMade = true;
    for (const predictionData of yearData) {
        if (predictionData.prediction === null) {
            allPredictionsMade = false;
        }
    }

    for (const predictionData of yearData) {
        // Get predictionDisplay from map
        const predictionDisplay = getPredictionDisplay(predictionData.name, year);

        // Create HTML references
        const makePredictionButton = predictionDisplay.querySelector('.make-prediction-button');
        const predictionInput = predictionDisplay.querySelector('.prediction-input');

        const predictionDate = predictionData.prediction;
        let predictionDateText;
        if (predictionDate === null) {
            // Prediction not made
            predictionDateText = "No Prediction";

            makePredictionButton.style.display = "block"
            predictionInput.style.display = "block";
        } else {
            if (allPredictionsMade) {
                // All predictions made
                predictionDateText = "Predicted Date: " + predictionDate;
            } else {
                // This prediction made, but not all
                predictionDateText = "Prediction Made";
            }

            // Prevent ability to input new prediction if one is already made
            makePredictionButton.style.display = "none"
            predictionInput.style.display = "none";
        }
        predictionDisplay.querySelector('.date').textContent = predictionDateText;
    }
}

/**
 * Adds a new tab to the tab display map.
 * 
 * @param {any} tabName - Name of the tab. Converts to string to be used as key.
 * @param {HTMLElement} tabContent - Content to be displayed as the tab.
 */
function addTabToMap(tabName, tabContent) {
    tabDisplaysMap.set(tabName.toString(), tabContent);
}

/**
 * Retrieves content corresponding to tab name.
 * 
 * @param {any} tabName - Name of the tab to retrieve content for.
 * @returns {HTMLElement} Content of the tab corresponding to name.
 */
function getTab(tabName) {
    return tabDisplaysMap.get(tabName.toString());
}

/**
 * Uses year to retrieve tab content.
 * 
 * @param {number} year - Year corresponding to yearDisplay. Converts to string to be used as key.
 * @returns {HTMLElement} Year display corresponding to year.
 */
function getYearDisplay(year) {
    return tabDisplaysMap.get(year.toString());
}

/**
 * Retrieves prediction display corresponding to year and name.
 * 
 * @param {string} name - Name of the person to find prediction display of.
 * @param {number} year - Year to search for prediction display.
 * @returns {HTMLElement} Content of the prediction display corresponding to name and year.
 */
function getPredictionDisplay(name, year) {
    return predictionDisplaysMap.get(getComposite(name, year));
}

/**
 * Adds prediciton display to map using year and name as key.
 * Creates composite (name_year) to be used as key.
 * 
 * @param {string} name - Name of the person in the prediciton display.
 * @param {number} year - Name of the prediction display's corresponding year.
 * @param {HTMLElement} predictionDisplay - Prediction display to be added to map.
 */
function setPredictionDisplay(name, year, predictionDisplay) {
    predictionDisplaysMap.set(getComposite(name, year), predictionDisplay);
}

/**
 * Creates composite of name and year for use as key in the prediciton display map.
 * 
 * @param {string} name - Name of person.
 * @param {number} year - Prediction year.
 * @returns {string} Composite of name and year. (name_year) / (Ben_2026)
 */
function getComposite(name, year) {
    return `${name}_${year}`;
}

/**
 * Retrieves calendar corresponding to year.
 * 
 * @param {number} year - Year to search for calendar.
 * @returns {Calendar} Calendar corresponding to given year.
 */
function getCalendar(year) {
    return getYearDisplay(year).querySelector('#calendar')._fullCalendar;
}

createPage();