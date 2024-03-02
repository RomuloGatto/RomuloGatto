module.exports = function (data) {
  const startedWorking = data.startedWorking.split('/').reverse();
  const pastWorking = new Date(...startedWorking).getTime();

  const startedCoding = data.startedCoding.split('/').reverse();
  const pastCoding = new Date(...startedCoding).getTime();
  
  const now = new Date().getTime();
  const plural = (num, word) => `${num} ${word}${num === 1 ? '' : 's'}`;
  
  const ms = {
    year: 31536000,
    month: 2628000,
    day: 86400,
  };

  let timeElapsedCoding = Math.floor((now - pastCoding) / 1000);
  let yearsCoding = {
    quotient: Math.floor(timeElapsedCoding / ms.year),
    rest: timeElapsedCoding % ms.year,
  };
  let monthsCoding = {
    quotient: Math.floor(yearsCoding.rest / ms.month),
    rest: yearsCoding.rest % ms.month,
  };
  let daysCoding = {
    quotient: Math.floor(monthsCoding.rest / ms.day),
  };

  let timeElapsedWorking = Math.floor((now - pastWorking) / 1000);
  let yearsWorking = {
    quotient: Math.floor(timeElapsedWorking / ms.year),
    rest: timeElapsedWorking % ms.year,
  };
  let monthsWorking = {
    quotient: Math.floor(yearsWorking.rest / ms.month),
    rest: yearsWorking.rest % ms.month,
  };
  let daysWorking = {
    quotient: Math.floor(monthsWorking.rest / ms.day),
  };


  const programing = `* ${plural(yearsCoding.quotient, 'Year')}, ${plural(monthsCoding.quotient, 'Month')} and ${plural(daysCoding.quotient, 'Day', )} since I started Coding`;
  const working = `* ${plural(yearsWorking.quotient, 'Year')}, ${plural(monthsWorking.quotient, 'Month')} and ${plural(daysWorking.quotient, 'Day', )} since I started Working with code`;
  return programing + '\n' + working
};
