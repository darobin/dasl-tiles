
const pre = document.querySelector('pre');

function checkAccess () {
  try {
    const value = window.parent.document.querySelector('#el').textContent;
    return 'allowed';
  }
  catch (err) {
    return 'blocked';
  }
}

function expected (outcome) {
  if (outcome === checkAccess()) {
    document.body.style.background = 'green';
    pre.textContent = `Success!`;
  }
  else {
    document.body.style.background = 'red';
    pre.textContent = `Fail…`;
  }
}
