import 'regenerator-runtime/runtime'

import { initContract, login, logout } from './utils'
import { v4 as uuidv4 } from 'uuid';

import getConfig from './config'
const { networkId } = getConfig(process.env.NODE_ENV || 'development')
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDM3ZDM2Y0FlOGEzMTFDMTljMUZEQmM1RjkzMzJjRUUzNzM4NDkzMDgiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTYzNzYyOTU2MTE1MywibmFtZSI6ImNoYWxsZW5nZTA1In0.aId-1M4GYijxrVWruIZUwYY62nTpzxBltZODQFb8kYU'

const submitButton = document.querySelector("#submit")
const dropArea = document.querySelector(".drag-image"),
dragText = dropArea.querySelector("h6"),
input = dropArea.querySelector("input"),
nameInput = document.querySelector("input[name='name']");
let file;
let fileData = null;

document.querySelector('#sign-in-button').onclick = login
document.querySelector('#sign-out-button').onclick = logout

// Display the signed-out-flow container
function signedOutFlow() {
  document.querySelector('#signed-out-flow').style.display = 'block'
}

// Displaying the signed in flow container and fill in account-specific data
function signedInFlow() {
  document.querySelector('#signed-in-flow').style.display = 'block'

  document.querySelectorAll('[data-behavior=account-id]').forEach(el => {
    el.innerText = window.accountId
  })

  // populate links in the notification box
  const accountLink = document.querySelector('[data-behavior=notification] a:nth-of-type(1)')
  accountLink.href = accountLink.href + window.accountId
  accountLink.innerText = '@' + window.accountId
  const contractLink = document.querySelector('[data-behavior=notification] a:nth-of-type(2)')
  contractLink.href = contractLink.href + window.contract.contractId
  contractLink.innerText = '@' + window.contract.contractId

  // update with selected networkId
  accountLink.href = accountLink.href.replace('testnet', networkId)
  contractLink.href = contractLink.href.replace('testnet', networkId)
}


// `nearInitPromise` gets called on page load
window.nearInitPromise = initContract()
  .then(() => {
    if (window.walletConnection.isSignedIn()) signedInFlow()
    else signedOutFlow()
  })
  .catch(console.error)



const beforeContent = dropArea.innerHTML;

async function uploadFile (file) {

  const resp = await fetch('https://api.nft.storage/upload', {
    method: 'POST',
    body: file,
    headers: {
      Authorization: `Bearer ${API_KEY}`
    }
  })
  fileData = await resp.json()
  submitButton.disabled = false
}

input.addEventListener("change",async  function(event) {
  if (event.target.files && event.target.files[0]) {
    const reader = new FileReader();
      reader.onload = function (e) {
        uploadFile(e.target.result)
      }   
      reader.readAsArrayBuffer(event.dataTransfer.files[0])
    }
    file = this.files[0];
    dropArea.classList.add("active");
    viewfile();
});

dropArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropArea.classList.add("active");
    dragText.textContent = "Release to Upload File";
});


dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("active");
    dragText.textContent = "Drag & Drop to Upload File";
});

dropArea.addEventListener("drop", async (event) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      submitButton.disabled = true
      const reader = new FileReader();
        reader.onloadend = function (e) {
          uploadFile(e.target.result)
        }
        reader.readAsArrayBuffer(event.dataTransfer.files[0])
      }
    file = event.dataTransfer.files[0];
    // await uploadFile(f)
    viewfile();
});

function clearForm() {
  dropArea.querySelector('img').remove()
        input.value = null
        dropArea.classList.remove('active')
        dropArea.innerHTML = beforeContent
        file = null
}
dropArea.addEventListener('click', (event) => {
    if (file){
        clearForm()
    }
});


function viewfile() {
    let fileType = file.type;
    let validExtensions = ["image/jpeg", "image/jpg", "image/png"];
    if (validExtensions.includes(fileType)) {

        let fileReader = new FileReader();
        fileReader.onloadend = () => {
            let fileURL = fileReader.result;
            let imgTag = `<img src="${fileURL}" alt="image">`;
            dropArea.innerHTML = imgTag;
        }
        fileReader.readAsDataURL(file);
    } else {
        alert("This is not an Image File!");
        dropArea.classList.remove("active");
        dragText.textContent = "Drag & Drop to Upload File";
    }
}

submitButton.onclick = async (event) => {
  submitButton.disabled = true
  console.log(nameInput.value, fileData)
  if(await window.walletConnection.isSignedIn() && nameInput.value && fileData){
    try {
      // make an update call to the smart contract
      await window.contract.nft_mint({
        token_id: uuidv4(),
        receiver_id: window.accountId,
        metadata: {
          title: nameInput.value,
          description: "...",
          spec: "nft-1.0.0",
          name: nameInput.value,
          symbol: "SYM",
          media: `https://${fileData.value.cid}.ipfs.dweb.link/`,
          copies: 1,
        }
      },'100000000000000', '100000000000000000000000')
    } catch (e) {
      throw e
    } finally {
      // re-enable the form, whether the call succeeded or failed
      clearForm()
      submitButton.disabled = false
      nameInput.value= ""
    }
  
  } else {
    alert("name is empty")
    submitButton.disabled = false
  }
}

const fileToBlob = async (file) => new Blob([new Uint8Array(await file.arrayBuffer())], {type: file.type });
