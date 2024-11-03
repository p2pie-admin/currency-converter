export const roundAmount = (amount: number, rude = false): number => {
  // в логарифм нули не вставляем
  const factor = rude ? 1 : 3;

  // if (amount > 99)
  //   return (
  //     +(amount / 10 ** String(amount).length).toFixed(1) *
  //     10 ** String(amount).length
  //   );
  if (!amount || typeof amount !== "number") return 0;
  if (amount > 100 && rude)
    return +(
      +(amount / 10 ** amount.toFixed(0).length).toFixed(2) *
      10 ** amount.toFixed(0).length
    ).toFixed(0);
  // нахожу минимальный значимый порядок числа
  // это такое число, в которое нужно возвести десятку, чтобы получить тысячную долю amount
  const orderOfMagnitude = -Math.floor(Math.log10(amount / 10 ** factor));
  //  округляем только часть после точки до порядка равного orderOfMagnitude
  return +amount.toFixed(orderOfMagnitude < 0 ? 0 : orderOfMagnitude);
};

type ICodesToRate = { [key: string]: number };

export const matchRates = (
  aToEuro: ICodesToRate,
  bToEuro: ICodesToRate
): ICodesToRate =>
  Object.entries(aToEuro).reduce((rates, [aCode, aToEuro]) => {
    const fiatRatesForOneCrypto = Object.entries(bToEuro).reduce(
      (dirs, [bCode, bToEuro]) => {
        const dirKey1 = `${aCode.toUpperCase()}_${bCode.toUpperCase()}`;
        const dirKey2 = `${bCode.toUpperCase()}_${aCode.toUpperCase()}`;
        const dirValue1 = roundAmount(bToEuro / aToEuro);
        const dirValue2 = roundAmount(aToEuro / bToEuro);
        return { ...dirs, [dirKey1]: dirValue1, [dirKey2]: dirValue2 };
      },
      {}
    );
    return { ...rates, ...fiatRatesForOneCrypto };
  }, {});

// obj1 = {a: [1,4], b: []};
// obj2 = {a: 7, b: 3}
// Output: { a: [ 1, 7 ], b: [ 2, 3 ] }

function getAnyFiveElements(obj: any) {
  // Get all entries (key-value pairs) from the object
  const entries = Object.entries(obj);

  // Shuffle the entries array
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }

  // Get the first 5 entries or less if the object has fewer than 5 elements
  return entries.slice(0, 5);
}

export const mergeRates = (
  oldRates: { [key: string]: number[] } | undefined,
  newRates: { [key: string]: number },
  limit: number
): { [key: string]: number[] } => {
  const merged: { [key: string]: number[] } = {};
  for (const key in newRates) {
    const oldRateList = oldRates?.[key] || [];
    const newRate = newRates[key];

    // If the old list is already within the limit, just add the new rate
    if (oldRateList.length < limit) {
      merged[key] = [...oldRateList, newRate];
    } else {
      // Slice only if needed to avoid unnecessary copying
      merged[key] = [...oldRateList.slice(1 - limit), newRate];
    }
  }

  return merged;
};
