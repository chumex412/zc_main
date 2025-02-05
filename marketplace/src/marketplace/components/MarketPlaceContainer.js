import axios from "axios"
import { useState, useEffect, useRef } from "react"
import { useHistory } from "react-router-dom"
import ReactPaginate from "react-paginate"
import { Modal, Spinner } from "react-bootstrap"

// Styles and Assets
import styles from "../styles/marketplace.module.css"
import zuriChatLogo from "../../component-assets/zurichatlogo.svg"
import SuccessMarkIcon from "../../component-assets/success-mark.svg"
import ErrorMarkIcon from "../../component-assets/error-mark.svg"

// Components
import PluginCard from "./PluginCard"
import { useMarketPlaceContext } from "../../context/MarketPlace.context"
import {
  setPluginId,
  loadPlugins,
  fetchPlugins
} from "../../context/marketplace/marketplace.action"
import { GetUserInfo } from "@zuri/utilities"

const MarketPlaceContainer = ({ type }) => {
  let currentWorkspace = localStorage.getItem("currentWorkspace")
  let token = sessionStorage.getItem("token")

  const history = useHistory()

  // MarketPlace states
  const [user, setUser] = useState({})
  const [plugin, setPlugin] = useState(null)
  const [plugins, setPlugins] = useState({
    all: [],
    installed: [],
    popular: []
  })

  // MarketPlace context
  const marketplaceContext = useMarketPlaceContext()

  // Loaders states
  const [isModalLoading, setIsModalLoading] = useState(false)
  const [isInstallButtonLoading, setIsInstallButtonLoading] = useState(false)
  const [isMarketPlaceLoading, setIsMarketPlaceLoading] = useState(false)

  // Modal Data States
  const [installModalStatus, setInstallModalStatus] = useState({
    isSuccess: null,
    message: ""
  })

  // Pagination states
  const [pageNumber, setPageNumber] = useState(0)
  const pluginsPerPage = 6
  const pagesVisited = pageNumber * pluginsPerPage
  const pageCount = Math.ceil(
    // marketplaceContext.state.plugins[`${type}`].length / pluginsPerPage
    plugins[`${type}`].length / pluginsPerPage
  )

  const changePage = ({ selected }) => {
    setPageNumber(selected)
  }

  useEffect(() => {
    getPlugins()
    getLoggedInUser()
  }, [])

  useEffect(() => {
    if (marketplaceContext.state.pluginId) {
      getSinglePluginData()
    }
  }, [marketplaceContext.state.pluginId])

  const getPlugins = async () => {
    setIsMarketPlaceLoading(true)
    try {
      let pluginData = plugins

      const get_all_plugins = await axios.get(
        "https://api.zuri.chat/marketplace/plugins"
      )
      const get_popular_plugins = await axios.get(
        "https://api.zuri.chat/marketplace/plugins/popular"
      )
      const get_installed_plugins = await axios.get(
        `https://api.zuri.chat/organizations/${currentWorkspace}/plugins`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (get_all_plugins.status === 200) {
        pluginData["all"] = get_all_plugins.data.data
      }

      if (get_popular_plugins.status === 200) {
        pluginData["popular"] = get_popular_plugins.data.data.filter(
          plugin => plugin.install_count > 10
        )
      }

      if (
        get_installed_plugins.status === 200 &&
        get_installed_plugins.data.data !== null
      ) {
        pluginData["installed"] = get_installed_plugins.data.data.map(
          plugin => plugin.plugin
        )
      }

      // marketplaceContext.dispatch(loadPlugins(data))
      setPlugins(pluginData)
      setIsMarketPlaceLoading(false)
    } catch (err) {
      setIsMarketPlaceLoading(false)
      console.error(err)
    }
  }

  const getSinglePluginData = async () => {
    setIsModalLoading(true)
    try {
      const response = await axios.get(
        `https://api.zuri.chat/marketplace/plugins/${marketplaceContext.state.pluginId}`
      )
      const { data } = response.data
      setPlugin(data)
      setIsModalLoading(false)
      setInstallModalStatus({
        isSuccess: null,
        message: ""
      })
    } catch (error) {
      setIsModalLoading(false)
      setInstallModalStatus({
        isSuccess: false,
        message: "Error Retrieving Plugin Data"
      })
    }
  }

  const installPluginToOrganization = async () => {
    if (!currentWorkspace) {
      alert("You are not logged into an Organization/workspace")
    }

    setIsInstallButtonLoading(true)
    setInstallModalStatus({
      isSuccess: null,
      message: ""
    })

    try {
      const response = await axios.post(
        plugin.install_url,
        {
          user_id: user[0]?._id,
          organisation_id: currentWorkspace
        },
        {
          timeout: 1000 * 5,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (response.data.success === true) {
        setIsInstallButtonLoading(false)
        setInstallModalStatus({
          isSuccess: true,
          message: "Plugin Installed Successfully. Redirecting..."
        })
        setTimeout(() => {
          // Redirect to redirect_url from plugins response
          history.push(response.data.data.redirect_url)
        }, 5000)
      } else {
        throw new Error(response.data.message)
      }
    } catch (err) {
      setInstallModalStatus({
        isSuccess: false,
        message: err.message ? err.message : "Plugin could not be installed"
      })
      setIsModalLoading(false)
      setIsInstallButtonLoading(false)
    }
  }

  const getLoggedInUser = async () => {
    try {
      const userInfo = await GetUserInfo()
      //Check if user id is valid and get user organization
      if (userInfo[0]._id !== "") {
        setUser(userInfo)
      }
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <>
      {isMarketPlaceLoading && (
        <div className="d-flex justify-content-center align-items-center w-100 flex-column py-3 mb-5">
          <Spinner animation="border" variant="success" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}

      {/* {!isMarketPlaceLoading && marketplaceContext.state.plugins[`${type}`].length > 0 && ( */}
      {!isMarketPlaceLoading && plugins[`${type}`].length > 0 && (
        <div className={styles.zuriMarketPlace__container}>
          {/* {marketplaceContext.state.plugins[`${type}`] */}
          {plugins[`${type}`]
            .slice(pagesVisited, pagesVisited + pluginsPerPage)
            .map(plugin => {
              // Logic to check if plugin is already installed
              let isInstalled = false
              let plugin_id = plugin.id ? plugin.id : plugin._id

              if (plugins.all.indexOf({ id: plugin_id }) !== -1)
                isInstalled = true

              return (
                <PluginCard
                  key={plugin_id}
                  pluginData={plugin}
                  installed={isInstalled}
                />
              )
            })}
        </div>
      )}

      {/* {!isMarketPlaceLoading && marketplaceContext.state.plugins[`${type}`].length > 0 && ( */}
      {!isMarketPlaceLoading && plugins[`${type}`].length == 0 && (
        <h2 className="text-center">No {type} plugins found.</h2>
      )}

      <ReactPaginate
        previousLabel={"Previous"}
        nextLabel={"Next"}
        pageCount={pageCount}
        onPageChange={changePage}
        containerClassName={styles.paginationBttns}
        previousClassName={styles.previousBttn}
        nextClassName={styles.nextBttn}
        disabledClassName={styles.paginationDisabled}
        activeClassName={styles.paginationActive}
      />

      {/* {marketplaceContext.state.isModal && marketplaceContext.state.pluginId && ( */}
      <Modal
        show={marketplaceContext.state.isModal}
        onHide={() => marketplaceContext.dispatch(setPluginId(null))}
        dialogClassName={styles.marketplaceModal}
        contentClassName={styles.modalContent}
        centered
      >
        {isModalLoading && (
          <div className="d-flex h-100 justify-content-center align-items-center flex-column py-3">
            <Spinner
              animation="border"
              variant="success"
              role="status"
            ></Spinner>
          </div>
        )}

        {!isModalLoading && plugin && installModalStatus.isSuccess === null && (
          <div
            className={`h-100 d-flex flex-column justify-content-center ${styles.marketplaceModalTop}`}
          >
            <figure className={styles.modalPluginIcon}>
              <img
                src={plugin.icon_url}
                onError={e => (e.target.src = zuriChatLogo)}
                alt={plugin.name}
              />
            </figure>
            <div className="ml-3">
              <h2 className="text-center">{plugin.name}</h2>

              <button
                onClick={() => installPluginToOrganization()}
                className={styles.modalInstallBtn}
                disabled={isInstallButtonLoading}
              >
                {isInstallButtonLoading ? (
                  <div className="d-flex flex-row align-items-center">
                    <Spinner animation="border" variant="light" role="status">
                      <span className="visually-hidden text-capitalize">
                        Loading...
                      </span>
                    </Spinner>
                  </div>
                ) : (
                  "Install"
                )}
              </button>
            </div>
            <div className={styles.marketplaceModalMain}>
              <h3>About:</h3>
              <div className={styles.marketplaceModalPluginImages}>
                {plugin.images && (
                  <>
                    {plugin.images
                      // Only show the first 3 images
                      .filter((image, index) => index < 3)
                      .map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          onError={e => (e.target.src = zuriChatLogo)}
                          alt={plugin.name}
                        />
                      ))}
                    <br />
                  </>
                )}
              </div>
              <p className="px-0">{plugin.description}</p>
              <hr />
              <div className="styles.marketplacePluginInfo">
                <h3>Plugin info:</h3>
                <p>
                  Downloads: {plugin.install_count}
                  <br />
                  Version: {plugin.version}
                  <br />
                  Created on: {plugin.created_at.slice(0, 10)}
                  <br />
                  Offered by: {plugin.developer_name}
                  <br />
                  Updated on: {plugin.updated_at.slice(0, 10)}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isModalLoading && installModalStatus.isSuccess !== null && (
          <div className="h-100 d-flex flex-column align-items-center justify-content-center">
            <figure
              className={
                installModalStatus.isSuccess
                  ? styles.successMarkContainer
                  : styles.errorMarkContainer
              }
            >
              <img
                src={
                  installModalStatus.isSuccess ? SuccessMarkIcon : ErrorMarkIcon
                }
                className={`${
                  installModalStatus.isSuccess
                    ? styles.successMark
                    : styles.errorMark
                } ${styles.MarkIcon}`}
                alt={`status icon`}
              />
            </figure>
            <p className={styles.MarkText}>{installModalStatus.message}</p>
          </div>
        )}
      </Modal>
      {/* )} */}
    </>
  )
}

export default MarketPlaceContainer
