import { ApiPromise, WsProvider } from '@polkadot/api';
import { AnyTuple } from '@polkadot/types-codec/types';
import { Init } from '@polkadot/api/base/Init';
import { isNullishCoalesce } from 'typescript';
import AddTwoToneIcon from '@mui/icons-material/AddTwoTone';
import { useEffect, useState, useRef, ChangeEvent } from 'react';
import { Suspense, lazy } from 'react';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import SuspenseLoader from 'src/components/SuspenseLoader';
import isUrlValid from 'url-validation';
import {
  Tooltip,
  FormControl,
  Box,
  CardHeader,
  Card,
  IconButton,
  Typography,
  Checkbox,
  Button,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  useTheme,
  TableContainer,
  Divider
} from '@mui/material';

import {
  FindInPageTwoTone,
  Looks4TwoTone,
  ScannerTwoTone,
  SearchTwoTone
} from '@mui/icons-material';

interface extrinsicListType {
  key: string;
  blockNumber: number;
  blockHash: string;
  index: number;
  method: string;
  args: AnyTuple;
  isSigned: boolean;
  section: string;
}

function PageHeader() {
  const theme = useTheme();
  let templateExtrinsicList: extrinsicListType[] = [
    {
      key: '',
      blockNumber: null,
      blockHash: '',
      index: null,
      method: '',
      args: null,
      isSigned: null,
      section: ''
    }
  ];
  const [rpcAddress, setRpcAddress] = useState('wss://rpc.polkadot.io');
  const [apiState, setApiState] = useState(ApiPromise.prototype);
  const [startBlock, setStartBlock] = useState(0);
  const [endBlock, setEndBlock] = useState(0);
  const [lastFetchedBlock, setlastFetchedBlock] = useState(0);
  const [initialEndBlock, setInitialEndBlock] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [extrinsicList, setExtrinsicList] = useState(templateExtrinsicList);
  const [extrinsicListPaginated, setExtrinsicListPaginated] = useState(
    templateExtrinsicList
  );
  const [page, setPage] = useState<number>(0);
  const [limit, setLimit] = useState<number>(5);
  const [sort, setSort] = useState({ column: 'block', direction: 'asc' });

  const refStartBlock = useRef();
  const refEndBlock = useRef();
  const refRpcAddress = useRef();
  const [errorMessage, setErrorMessage] = useState('');

  function fetchTransactions() {
    fetchPolkadotTransactions();
  }

  async function fetchPolkadotTransactions() {
    //check we have a real API thign
    setIsScanning(true);
    let listOfExtrinsics = new Array<extrinsicListType>();
    console.log(`---------------------------------------------------`);
    console.log('-----------------LETS BEGIN!!!--------------');
    console.log(`---------------------------------------------------`);
    setlastFetchedBlock(startBlock);

    for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
      console.log(`---------------------------------------------------`);
      console.log(`--------   BLOCK: ${blockNum} --------------`);
      const blockHash = await apiState.rpc.chain.getBlockHash(blockNum);
      const apiAt = await apiState.at(blockHash);
      const events_ = await apiAt.query.system.events();
      const countEvents = await apiAt.query.system.eventCount();
      const eventTopics = await apiAt.query.system.eventTopics(blockHash);
      const methods = await apiState.rpc.rpc.methods();

      //these comments below are just me trying to figure out
      // what it is we get in the data
      console.log(`***${events_}******`);
      console.log(`***${countEvents}******`);
      console.log(`***${eventTopics}******`);
      console.log(`***** METHODS ****`);
      console.log(`***** ${methods.methods.toJSON()} ****`);
      console.log(events_.toJSON());
      console.log(`************************`);
      console.log(`Block Hash : ${blockHash}, `);

      setlastFetchedBlock(blockNum);
      const signedBlock = await apiState.rpc.chain.getBlock(blockHash);

      //Collate each extrinsic and format the data for displaying in the UI table
      signedBlock.block.extrinsics.forEach((ex, index) => {
        // the extrinsics are decoded by the API, human-like view
        console.log('human view of extrinsics');
        console.log(index, ex.toHuman());
        const {
          isSigned,
          meta,
          method: { args, method, section }
        } = ex;

        //struct that will be used for our table data
        listOfExtrinsics.push({
          key: blockNum.toString() + index.toString(),
          blockNumber: blockNum,
          blockHash: blockHash.toString(),
          index: index,
          method: method,
          args: args,
          isSigned: isSigned,
          section: section
        });
      });

      setExtrinsicList([...listOfExtrinsics]);
      console.log(`--------  END  BLOCK: ${blockNum} --------------`);
      console.log(`---------------------------------------------------`);
    }

    setExtrinsicList([...listOfExtrinsics]);
    setIsScanning(false);
  }

  async function getPolkadotAPI() {
    console.log('polkadotAPI', rpcAddress);
    const wsProvider = new WsProvider(rpcAddress);

    // Create the API and wait until ready
    const api = await ApiPromise.create({ provider: wsProvider });
    const [chain, nodeName, nodeVersion, lastHeader] = await Promise.all([
      api.rpc.system.chain(),
      api.rpc.system.name(),
      api.rpc.system.version(),
      // Retrieve the latest header
      api.rpc.chain.getHeader()
    ]);

    console.log(typeof api, api);
    setApiState(api);
    setEndBlock(lastHeader.number.toNumber());
    setStartBlock(lastHeader.number.toNumber() - 5);
    setInitialEndBlock(lastHeader.number.toNumber());
    console.log(
      `You are connected to chain ${chain} using ${nodeName} v${nodeVersion},
      Latest Block #${lastHeader.number} has hash ${lastHeader.hash}`
    );

    return api;
  }

  const applyPagination = (
    extrinsicItems: extrinsicListType[],
    page: number,
    limit: number
  ): extrinsicListType[] => {
    return extrinsicItems.slice(page * limit, page * limit + limit);
  };

  const applySort = (
    extrinsicItems: extrinsicListType[]
  ): extrinsicListType[] => {
    switch (sort.column) {
      case 'block':
        return sort.direction === 'asc'
          ? extrinsicItems.sort((a, b) => a.blockNumber - b.blockNumber)
          : extrinsicItems.sort((a, b) => b.blockNumber - a.blockNumber);
      case 'index':
        return sort.direction === 'asc'
          ? extrinsicItems.sort((a, b) => a.index - b.index)
          : extrinsicItems.sort((a, b) => b.index - a.index);
      case 'method':
        return sort.direction === 'asc'
          ? extrinsicItems.sort((a, b) =>
              a.method < b.method ? -1 : a.method > b.method ? 1 : 0
            )
          : extrinsicItems.sort((a, b) =>
              a.method > b.method ? -1 : a.method < b.method ? 1 : 0
            );

      default:
        return extrinsicItems.sort((a, b) =>
          a.blockNumber > b.blockNumber ? 1 : -1
        );
    }
  };

  const handlePageChange = (event: any, newPage: number): void => {
    setPage(newPage);
  };

  const handleLimitChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setLimit(parseInt(event.target.value));
  };

  const handleEndBlockChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setEndBlock(value);
  };

  const handleStartBlockChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setStartBlock(value);
  };

  const validate = (value) => {
    if (isUrlValid(value.replace('wss://', 'https://'))) {
      setErrorMessage('');
    } else {
      setErrorMessage('Is Not Valid URL');
    }
  };

  const sortExtrinsincPaginatedList = (e) => {
    let colNameClicked = e.target.valueOf().innerHTML.toLowerCase();

    let currentSortName = sort.column;
    let currentSortDirection = sort.direction;

    let updateSortName = '';
    let updateSortDirection = 'asc';

    //if the same sorting column is clicked then toggle the asc/desc
    if (currentSortName === colNameClicked) {
      updateSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
      setSort({ column: currentSortName, direction: updateSortDirection });
    } else if (currentSortName !== colNameClicked) {
      setSort({ column: colNameClicked, direction: updateSortDirection });
    }
  };

  useEffect(() => {
    getPolkadotAPI();
  }, []);

  useEffect(() => {
    console.log('Update End block to : ', initialEndBlock);
    setEndBlock(initialEndBlock);
    // refEndBlock.current.defaultValue = initialEndBlock;
  }, [initialEndBlock]);

  useEffect(() => {
    // When this is triggered we update the output to display the latest in the table
    setEndBlock(initialEndBlock);
    setExtrinsicListPaginated([
      //each time the extrinsic list is updated refresh the formatted table data
      ...applyPagination(applySort(extrinsicList), page, limit)
    ]);
  }, [
    extrinsicList,
    lastFetchedBlock,
    isScanning,
    page,
    limit,
    errorMessage,
    sort
  ]);

  return (
    <>
      <Grid container justifyContent="space-between" alignItems="center">
        <Grid item>
          <Typography variant="h3" component="h3" gutterBottom>
            Polkadot Transaction Explorer
          </Typography>
          <br></br>
          <TextField
            ref={refStartBlock}
            required
            id="block-start"
            label="Start Block"
            value={startBlock}
            defaultValue={startBlock}
            variant="outlined"
            onChange={handleStartBlockChange}
          />
          <TextField
            onChange={handleEndBlockChange}
            required
            ref={refEndBlock}
            id="block-end"
            label="End Block"
            value={endBlock}
            defaultValue={endBlock}
            variant="outlined"
          />{' '}
          <pre>
            <TextField
              id="rpc-address"
              ref={refRpcAddress}
              label="RPC Address"
              defaultValue={rpcAddress}
              variant="outlined"
              onChange={(e) => validate(e.target.value)}
            />

            <span
              style={{
                fontWeight: 'bold',
                color: 'red'
              }}
            >
              {errorMessage}
            </span>
          </pre>
          <Button
            sx={{ mt: { xs: 2, md: 0 } }}
            startIcon={<SearchTwoTone />}
            variant="contained"
            onClick={fetchTransactions}
            disabled={endBlock > 0 && !isScanning ? false : true}
          >
            Scan
          </Button>
          {!isScanning
            ? ''
            : ` Scanning ${lastFetchedBlock - (startBlock - 1)} / ${
                endBlock - startBlock + 1
              } ( ${(
                ((lastFetchedBlock - (startBlock - 1)) /
                  (endBlock - startBlock + 1)) *
                100
              ).toFixed(2)} % )  `}
        </Grid>
      </Grid>
      <br />
      {lastFetchedBlock === 0 ? (
        ''
      ) : (
        <Card>
          <CardHeader
            action={
              <Box width={700}>
                <FormControl fullWidth variant="outlined"></FormControl>
              </Box>
            }
            title="Transaction List"
          />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell onClick={sortExtrinsincPaginatedList}>
                    <Typography noWrap>Block</Typography>
                  </TableCell>
                  <TableCell onClick={sortExtrinsincPaginatedList}>
                    <Typography noWrap>Index</Typography>
                  </TableCell>
                  <TableCell onClick={sortExtrinsincPaginatedList}>
                    <Typography noWrap>Method</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography noWrap>Signed</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography noWrap>Arguments</Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {' '}
                {extrinsicListPaginated.map((extrinsic) => {
                  return (
                    <TableRow hover key={extrinsic.key}>
                      <TableCell>
                        <Typography
                          variant="body1"
                          fontWeight="bold"
                          color="text.primary"
                          gutterBottom
                          noWrap
                        >
                          {extrinsic.blockNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body1"
                          fontWeight="bold"
                          color="text.primary"
                          gutterBottom
                          noWrap
                        >
                          {extrinsic.index}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body1"
                          fontWeight="bold"
                          color="text.primary"
                          gutterBottom
                          noWrap
                        >
                          {extrinsic.method}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                        >
                          {extrinsic.isSigned === null
                            ? ''
                            : extrinsic.isSigned.toString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body1"
                          fontWeight="bold"
                          color="text.primary"
                          gutterBottom
                          noWrap
                        >
                          {extrinsic.args === null
                            ? ''
                            : extrinsic.args
                                .map((a) => a.toString())
                                .join(', ')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Box p={2}>
            <TablePagination
              component="div"
              count={extrinsicList.length}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleLimitChange}
              page={page}
              rowsPerPage={limit}
              rowsPerPageOptions={[5, 10, 25, 30]}
            />
          </Box>
        </Card>
      )}
    </>
  );
}

export default PageHeader;
