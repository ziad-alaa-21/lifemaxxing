#!/usr/bin/env node
/**
 * test-plate-buttons.mjs
 *
 * Unit tests for Plate Quick-Add & Stepper Undo behavior:
 * 1. Equipment check: plate buttons show ONLY when exercise equipment is "barbell" and unit is kilograms.
 * 2. Rule: Tapping a plate weight adds one plate on EACH side (+2 * plateWeight).
 * 3. Empty-bar case: Tapping +20 each side on an empty 20 kg bar gives 60 kg.
 * 4. Under-bar case: If weight is unset or < 20 kg on a barbell, starting with a 20 kg bar + 20 kg each side yields 60 kg.
 * 5. Stepper Undo: Decrementing reverts the total weight step-by-step or by plate increments.
 */
import assert from "node:assert/strict";

console.log("Running Plate Quick-Add, Equipment Filter, and Stepper Undo tests...\n");

const OLYMPIC_BAR_KG = 20;

function shouldShowPlateButtons(exercise, unit = "kg") {
  if (unit !== "kg") return false;
  return exercise?.equipment?.toLowerCase() === "barbell";
}

function calculatePlateAddition(currentWeight, plateWeight, barWeight = OLYMPIC_BAR_KG) {
  // If weight is 0 or less than bar weight on a barbell, use bar weight as the starting point
  const baseWeight = (currentWeight === "" || Number(currentWeight) < barWeight)
    ? barWeight
    : Number(currentWeight);
  const addedTotal = plateWeight * 2;
  const newTotal = baseWeight + addedTotal;
  return { addedEachSide: plateWeight, addedTotal, newTotal };
}

function createWorkoutSetState(initialWeight, equipment = "barbell") {
  let currentWeight = initialWeight;
  const exercise = { equipment };

  const updateSet = (field, value) => {
    if (field === "weightKg") {
      currentWeight = value === "" ? 0 : Number(value);
    }
  };

  const addPlate = (plateWeight) => {
    if (!shouldShowPlateButtons(exercise, "kg")) {
      throw new Error("Plate buttons not available for non-barbell equipment");
    }
    const { newTotal } = calculatePlateAddition(currentWeight, plateWeight);
    updateSet("weightKg", String(newTotal));
    return newTotal;
  };

  const stepWeight = (delta) => {
    const next = Math.max(0, currentWeight + delta);
    updateSet("weightKg", String(next));
    return next;
  };

  return {
    getWeight: () => currentWeight,
    canShowPlates: () => shouldShowPlateButtons(exercise, "kg"),
    addPlate,
    stepWeight,
  };
}

// TEST 1: Equipment filter (Barbell vs Dumbbell/Machine/Cable)
{
  assert.equal(shouldShowPlateButtons({ equipment: "barbell" }, "kg"), true, "Barbell in kg shows plate buttons");
  assert.equal(shouldShowPlateButtons({ equipment: "Barbell" }, "kg"), true, "Case-insensitive barbell check");
  assert.equal(shouldShowPlateButtons({ equipment: "dumbbell" }, "kg"), false, "Dumbbell hides plate buttons");
  assert.equal(shouldShowPlateButtons({ equipment: "machine" }, "kg"), false, "Machine hides plate buttons");
  assert.equal(shouldShowPlateButtons({ equipment: "cable" }, "kg"), false, "Cable hides plate buttons");
  assert.equal(shouldShowPlateButtons({ equipment: "barbell" }, "lbs"), false, "Non-kg unit hides plate buttons");
  console.log("PASS: Plate buttons show ONLY for barbell exercises in kg");
}

// TEST 2: Standard loaded lift: 60 kg + 20 each side = 100 kg
{
  const state = createWorkoutSetState(60, "barbell");
  const newWeight = state.addPlate(20);
  assert.equal(newWeight, 100, "60 kg + 20 each side (+40 kg total) = 100 kg");
  assert.equal(state.getWeight(), 100);
  console.log("PASS: 60 kg + 20 kg each side (+40 kg total) = 100 kg");
}

// TEST 3: Empty-bar case: 20 kg empty bar + 20 each side = 60 kg
{
  const state = createWorkoutSetState(20, "barbell");
  const newWeight = state.addPlate(20);
  assert.equal(newWeight, 60, "Empty 20 kg bar + 20 each side = 60 kg");
  assert.equal(state.getWeight(), 60);
  console.log("PASS: Empty-bar case (20 kg bar + 20 kg each side = 60 kg)");
}

// TEST 4: Under-bar case: weight is 0 or 10 kg (< 20 kg base bar)
{
  // 0 kg case
  const state0 = createWorkoutSetState(0, "barbell");
  const newWeight0 = state0.addPlate(20);
  assert.equal(newWeight0, 60, "0 kg on barbell defaults to 20 kg bar + 40 kg plates = 60 kg");

  // 10 kg case (< 20 kg bar)
  const state10 = createWorkoutSetState(10, "barbell");
  const newWeight10 = state10.addPlate(20);
  assert.equal(newWeight10, 60, "Under-bar weight snaps to bar base 20 kg + 40 kg plates = 60 kg");

  console.log("PASS: Under-bar cases (< 20 kg) safely initialize from 20 kg base barbell");
}

// TEST 5: Stepper Undo from 100 kg back to 60 kg
{
  const state = createWorkoutSetState(60, "barbell");
  state.addPlate(20); // 100 kg
  assert.equal(state.getWeight(), 100);

  // Undo via 2.5 kg stepper decrements (16 steps = 40 kg)
  for (let i = 0; i < 16; i++) {
    state.stepWeight(-2.5);
  }
  assert.equal(state.getWeight(), 60, "Stepper undo in 2.5 kg increments returns to 60 kg");

  // Direct undo by 40 kg (-20 each side)
  const state2 = createWorkoutSetState(60, "barbell");
  state2.addPlate(20);
  state2.stepWeight(-40);
  assert.equal(state2.getWeight(), 60, "Direct plate undo returns to 60 kg");

  console.log("PASS: Stepper undo correctly reverts total weight back to initial weight");
}

console.log("\nAll Plate Quick-Add & Stepper Undo tests PASSED!");
