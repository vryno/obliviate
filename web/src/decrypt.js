import React from "react";
import nacl from "tweetnacl";
import naclutil from "tweetnacl-util";
import {libs} from "./commons";
import $ from "jquery";

function Decrypt(props) {

    console.log("Decrypt start");

    const hasPassword = window.location.search.substring(1).length === libs.queryIndexWithPassword;
    let urlNonce = '';
    let hash = '';
    const keys = nacl.box.keyPair(); // -----> in deep
    let salt = '';
    let secretKey = '';
    let encodedMessage = '';


    function loadCypher() {
        decodeButtonAccessibility(false);

        const nonce = window.location.search.substring(1) + window.location.hash.substring(1);
        try {
            urlNonce = naclutil.decodeBase64(nonce);
        } catch (ex) {
            decodeButtonAccessibility(true);
            alert(props.var.linkIsCorrupted);
            return;
        }
        hash = naclutil.encodeBase64(nacl.hash(urlNonce));
        const obj = {};
        obj.hash = hash;
        obj.publicKey = naclutil.encodeBase64(keys.publicKey);
        if (hasPassword) {
            obj.password = true;
        }

        libs.post('POST', obj, libs.READ_URL, decryptTransmission, loadError);
    }

    function decryptTransmission(result) {
        // decode transmission with box
        const messageWithNonceAsUint8Array = naclutil.decodeBase64(result.message);
        const noncePart = libs.arraySlice(messageWithNonceAsUint8Array, 0, nacl.box.nonceLength);
        const messagePart = libs.arraySlice(messageWithNonceAsUint8Array, nacl.box.nonceLength, result.message.length);

        const decrypted = nacl.box.open(messagePart, noncePart, props.var.serverPublicKey, keys.secretKey);
        if (!decrypted) {
            $('#decodedMessage').html("{{.generalError}}");
            showDecodedMessage();
            return
        }
        // decode message with secretbox
        if (hasPassword) {
            salt = libs.arraySlice(decrypted, 0, nacl.secretbox.keyLength);
        } else {
            secretKey = libs.arraySlice(decrypted, 0, nacl.secretbox.keyLength);
        }
        encodedMessage = libs.arraySlice(decrypted, nacl.secretbox.keyLength, decrypted.length);
        decryptMessage();
    }

    function decryptMessage() {
        $("#decryptPassword").removeClass('is-invalid');
        decodeButtonAccessibility(false);
        if (hasPassword) {
            const password = $('#decryptPassword').val();
            if (password.length > 0) {
                libs.calculateKeyDerived(password, salt, libs.scryptLogN, scryptCallback);
            } else {
                $("#decryptPassword").addClass('is-invalid');
                decodeButtonAccessibility(true);
                changeAction();
            }
            return;
        }
        continueXXXXXXXX();
    }

    function scryptCallback(key, time) { // do nothing with time while decrypt
        secretKey = key;
        continueXXXXXXXX();
    }

    function continueXXXXXXXX() {
        const messageBytes = nacl.secretbox.open(encodedMessage, urlNonce, secretKey);
        if (messageBytes == null) {
            if (hasPassword) {
                $("#decryptPassword").addClass('is-invalid');
                changeAction();
                decodeButtonAccessibility(true);
                return;
            }
            $('#decodedMessage').html(props.var.generalError);
            showDecodedMessage(); // TODO: remove "Decoded message:" header
            return;
        }

        const message = naclutil.encodeUTF8(messageBytes);

        alert(message);
        // const escape = document.createElement('textarea');
        // escape.textContent = message;
        // escape.innerHTML;

        const str = libs.replaceAll(escape.innerHTML, '\n', '<br/>');
        $('#decodedMessage').html(str);
        showDecodedMessage();

        if (hasPassword) {
            const obj = {};
            obj.hash = hash;
            libs.post('DELETE', obj, libs.DELETE_URL, deleteSuccess, deleteError(obj));
        }

    }

    function loadError(XMLHttpRequest, textStatus, errorThrown) {
        if (XMLHttpRequest.status === 404) {
            $("#decodeButtonBlock").addClass('d-none');
            $("#decryptPasswordBlock").addClass('d-none');
            $("#errorForDecodedMessage").removeClass('d-none');
            decodeButtonAccessibility(true);
        } else {
            decodeButtonAccessibility(true);
            alert('{{.decryptNetworkError}}')
        }
    }

    function deleteSuccess() {
        // do nothing
    }

    function deleteError(obj) {
        return function (XMLHttpRequest, textStatus, errorThrown) {
            // try to delete again
            window.setTimeout(function () {
                libs.post('DELETE', obj, '/delete?again', deleteSuccess, deleteErrorTryAgain);
            }, 1000);
        }
    }

    function deleteErrorTryAgain(XMLHttpRequest, textStatus, errorThrown) {// do nothing
    }

    function changeAction() {
        $("#decodeButton").off('click');
        $("#decodeButton").click(function (e) {
            decryptMessage();
        });
    }


    function decodeButtonAccessibility(state) {
        if (state) {
            // $("#decodeButton").removeClass('disabled');
            // $("#decodeButtonSpinner").addClass('d-none');
        } else {
            // $("#decodeButton").addClass('disabled');
            // if (!IE()) {
            //     $("#decodeButtonSpinner").removeClass('d-none');
            // }
        }
    }

    function showDecodedMessage() {
        // $("#inputMessageBlock").addClass('d-none');
        // $("#linkBlock").addClass('d-none');
        // $("#decodeBlock").addClass('d-none');
        // $("#presentationBlock").removeClass('d-none');

        decodeButtonAccessibility(true);
    }


    return (
        <>
            <div className="container">
                <div className="row d-none" id="errorForDecodedMessage">
                    <div className="col-sm">
                        <p className="text-secondary">{props.var.messageRead}
                        </p>
                    </div>
                </div>
                <div className="row">
                    <div className="input-group mb-3" id="decryptPasswordBlock">
                        <div className="input-group">
                            <div className="input-group-prepend">
                                <span className="input-group-text">{props.var.password}</span>
                            </div>
                            <input type="text" className="form-control" id="decryptPassword"
                                   placeholder={props.var.passwordDecryptPlaceholder}/>
                        </div>
                        <div className="col-sm text-danger text-center font-weight-light d-none"
                             id="ieDecryptWarning">{props.var.ieDecryptWarning}</div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm mb-2" id="decodeButtonBlock">
                        <button type="button" className="btn btn-danger btn-block btn-lg"
                                id="decodeButton" onClick={loadCypher}>
                            <span className="spinner-border spinner-border-sm d-none" id="decodeButtonSpinner"/>
                            {props.var.readMessageButton}
                        </button>
                    </div>
                    <div className="col-sm">
                        <button type="button" className="btn btn-primary btn-block btn-lg"
                                onClick={props.againCallback}>{props.var.newMessageButton}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Decrypt;