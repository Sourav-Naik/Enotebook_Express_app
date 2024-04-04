import jsonWebToken from "jsonwebtoken";
const FetchUser = async (req, res, next) => {
  /*----------------get user detailes from token------------------- */
  const token = await req.header("auth-token");
  try {
    let data = jsonWebToken.verify(token, "Sourav");
    req.userData = data.id;
    next();
  } catch (error) {
    res.status(401).json({ msg: "Please authenticate using a valid token" });
  }
};
export default FetchUser;
