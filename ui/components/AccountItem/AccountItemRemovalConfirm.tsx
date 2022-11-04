import { removeAccount } from "@tallyho/tally-background/redux-slices/accounts"
import {
  AccountTotal,
  selectAccountSignersByAddress,
  selectKeyringByAddress,
} from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement } from "react"
import { setNewSelectedAccount } from "@tallyho/tally-background/redux-slices/ui"
import { useHistory } from "react-router-dom"
import { sameEVMAddress } from "@tallyho/tally-background/lib/utils"
import { useTranslation } from "react-i18next"
import { selectLedgerDeviceByAddresses } from "@tallyho/tally-background/redux-slices/selectors/ledgerSelectors"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"

import SharedButton from "../Shared/SharedButton"
import SharedAccountItemSummary from "../Shared/SharedAccountItemSummary"
import {
  useAreKeyringsUnlocked,
  useBackgroundDispatch,
  useBackgroundSelector,
} from "../../hooks"
import AccountItemActionHeader from "./AccountItemActionHeader"
import RemoveAccountWarning from "./RemoveAccountWarning"

interface AccountItemRemovalConfirmProps {
  account: AccountTotal
  close: () => void
}

export default function AccountItemRemovalConfirm({
  account,
  close,
}: AccountItemRemovalConfirmProps): ReactElement {
  const { address, network } = account

  const { t } = useTranslation("translation", {
    keyPrefix: "accounts.accountItem",
  })
  const dispatch = useBackgroundDispatch()
  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)
  const history = useHistory()
  const keyring = useBackgroundSelector(selectKeyringByAddress(address))
  const { selectedAddress, accountsData } = useBackgroundSelector((state) => ({
    selectedAddress: state.ui.selectedAccount.address,
    accountsData: state.account.accountsData,
  }))
  const accountSigners = useBackgroundSelector(selectAccountSignersByAddress)
  const readOnlyAccount = typeof keyring === "undefined"
  const lastAddressInKeyring = keyring?.addresses.length === 1

  const ledgerDeviceByAddress = useBackgroundSelector(
    selectLedgerDeviceByAddresses
  )

  const lastAddressInLedger =
    accountSigners[address]?.type === "ledger" &&
    Object.values(ledgerDeviceByAddress[address].accounts).length === 1

  const lastAccountInTallyWallet = Object.keys(accountSigners).length === 1

  const lastAddressInAccount = lastAddressInKeyring || lastAddressInLedger

  const showWarning =
    lastAccountInTallyWallet || readOnlyAccount || lastAddressInAccount
  return (
    <div className="remove_address_option">
      <div className="header">
        <AccountItemActionHeader
          label={t("removeAddress")}
          icon="garbage@2x.png"
          color="var(--error)"
        />
      </div>
      <ul>
        <li className="account_container">
          <li className="standard_width">
            <SharedAccountItemSummary
              accountTotal={account}
              isSelected={false}
            />
          </li>
        </li>
      </ul>
      <div className="remove_address_details">
        {showWarning && (
          <RemoveAccountWarning
            isReadOnlyAccount={readOnlyAccount}
            lastAddressInAccount={lastAddressInAccount}
            lastAccountInTallyWallet={lastAccountInTallyWallet}
          />
        )}
      </div>
      <div className="button_container">
        <SharedButton
          type="secondary"
          size="medium"
          onClick={(e) => {
            e.stopPropagation()
            close()
          }}
        >
          {t("cancel")}
        </SharedButton>
        <SharedButton
          type="primary"
          size="medium"
          onClick={(e) => {
            e.stopPropagation()
            // don't prompt for unlock if removing read-only account.
            if (readOnlyAccount || areKeyringsUnlocked) {
              dispatch(
                removeAccount({
                  addressOnNetwork: { address, network },
                  signer: accountSigners[address],
                  lastAddressInAccount,
                })
              )

              if (
                lastAccountInTallyWallet &&
                isEnabled(FeatureFlags.SUPPORT_TABBED_ONBOARDING)
              ) {
                window.open("/tab.html#onboarding")
                window.close()
                return
              }

              if (sameEVMAddress(selectedAddress, address)) {
                const newAddress = Object.keys(
                  accountsData.evm[network.chainID]
                ).find((accountAddress) => accountAddress !== address)
                if (newAddress) {
                  dispatch(
                    setNewSelectedAccount({
                      address: newAddress,
                      network,
                    })
                  )
                }
              }
              close()
            } else {
              history.push("/keyring/unlock")
            }
          }}
        >
          {t("removeConfirm")}
        </SharedButton>
      </div>
      <style jsx>{`
        li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0 auto;
          width: 336px;
          height: 52px;
        }
        .header {
          height: 24px;
        }
        .remove_address_option {
          margin-left: 20px;
          margin-right: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 95%;
        }
        .remove_address_details {
          display: flex;
          flex-direction: column;
          line-height: 24px;
          font-size 16px;
        }
        .button_container {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
        }
        .account_container {
          margin-top: -10px;
          background-color: var(--hunter-green);
          padding: 5px;
          border-radius: 16px;
        }
      `}</style>
    </div>
  )
}
